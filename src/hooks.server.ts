import type { Handle } from '@sveltejs/kit'
import {
  assertProxySecretConfigured,
  createServerPocketBase,
  POCKETBASE_URL,
  PROXY_SECRET_HEADER
} from '@/lib/server/pocketbase'
import {
  AUTH_SESSION_COOKIE_NAME,
  assertAuthSecretConfigured,
  clearAuthSessionCookie,
  sanitizeUser,
  verifyAuthSession
} from '@/lib/server/twoFactor'

assertAuthSecretConfigured()
assertProxySecretConfigured()

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname

  // Check if this is a request intended for PocketBase (API or admin assets)
  const isPocketBaseRequest =
    (pathname.startsWith('/api/') && !pathname.startsWith('/api/chat') && !pathname.startsWith('/api/random')) ||
    pathname === '/_' ||
    pathname.startsWith('/_/')

  if (isPocketBaseRequest) {
    // PocketBase decodes percent-encoded paths, so match against the decoded and normalized path
    let normalizedPath: string
    try {
      const decoded = decodeURIComponent(pathname).toLowerCase()
      normalizedPath = decoded.replace(/\/+/g, '/').replace(/\/+$/, '') || '/'
    } catch {
      return new Response(JSON.stringify({ code: 400, message: 'Invalid request path.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      })
    }

    // Block direct user authentication, OTP, registration, and batch endpoints
    // (whether addressed by collection name 'users' or internal ID '_pb_users_auth_').
    // Superusers (_superusers) are exempted so the PocketBase Admin UI (/_/) and admin recovery remain functional.
    // All regular user authentication must go through SvelteKit's /login and /register routes
    // where rate-limiting, password verification, and 2FA (TOTP/Email) are enforced.
    const authEndpointMatch = normalizedPath.match(
      /^\/api\/collections\/([^/]+)\/(auth-with-password|auth-with-otp|request-otp|auth-with-oauth2)$/
    )
    const isSuperuserCollection =
      authEndpointMatch !== null &&
      (authEndpointMatch[1] === '_superusers' || authEndpointMatch[1] === 'pbc_3142635823')

    const isDirectAuthEndpoint = authEndpointMatch !== null && !isSuperuserCollection
    const isDirectUserCreate =
      event.request.method.toUpperCase() === 'POST' &&
      /^\/api\/collections\/(users|_pb_users_auth_)\/records$/.test(normalizedPath)
    const isBatchEndpoint = normalizedPath === '/api/batch'

    if (isDirectAuthEndpoint || isDirectUserCreate || isBatchEndpoint) {
      return new Response(
        JSON.stringify({
          code: 403,
          message: 'Direct authentication through API proxy is disabled. Use the /login page.'
        }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      )
    }

    // Verify 2FA auth session if an auth token is presented in Authorization header or pb_auth cookie.
    // Skip for static Admin UI assets (/_/) and superuser endpoints so a stale regular-user pb_auth cookie
    // never blocks loading the Admin dashboard or completing superuser authentication/recovery.
    const isAdminUiAsset = normalizedPath === '/_' || normalizedPath.startsWith('/_/')
    const isSuperuserEndpoint = /^\/api\/collections\/(_superusers|pbc_3142635823)(\/|$)/.test(
      normalizedPath
    )

    if (!isAdminUiAsset && !isSuperuserEndpoint) {
      const authHeader = (event.request.headers.get('authorization') || '').trim()
      let token = ''
      if (/^bearer\s+/i.test(authHeader)) {
        token = authHeader.replace(/^bearer\s+/i, '').trim()
      } else if (authHeader) {
        token = authHeader
      }

      if (!token) {
        const cookieHeader = event.request.headers.get('cookie') || ''
        const pbCookieMatch = cookieHeader.match(/(?:^|;\s*)pb_auth=([^;]+)/)
        if (pbCookieMatch) {
          try {
            const cookieVal = decodeURIComponent(pbCookieMatch[1])
            const parsed = JSON.parse(cookieVal)
            if (parsed && typeof parsed === 'object' && parsed.token) {
              token = parsed.token
            }
          } catch {
            // Ignore cookie parse error
          }
        }
      }

      if (token) {
        let tokenUserId: string | undefined
        let isSuperuserToken = false
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
            if (typeof payload?.id === 'string' && payload.id) {
              tokenUserId = payload.id
            }
            if (
              payload?.collectionId === '_superusers' ||
              payload?.collectionId === 'pbc_3142635823' ||
              payload?.type === 'admin'
            ) {
              isSuperuserToken = true
            }
          }
        } catch {
          return new Response(
            JSON.stringify({ code: 401, message: 'Invalid authentication token.' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
          )
        }

        if (!tokenUserId) {
          return new Response(
            JSON.stringify({ code: 401, message: 'Invalid authentication token.' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
          )
        }

        // SvelteKit 2FA session verification applies strictly to regular users;
        // superusers authenticate and manage MFA directly inside PocketBase.
        if (!isSuperuserToken) {
          const sessionSig = event.cookies.get(AUTH_SESSION_COOKIE_NAME)
          if (!verifyAuthSession(sessionSig, tokenUserId)) {
            return new Response(
              JSON.stringify({
                code: 401,
                message: 'Session requires two-factor verification. Please log in again.'
              }),
              { status: 401, headers: { 'content-type': 'application/json' } }
            )
          }
        }
      }
    }

    // Proxy the request to the internal PocketBase instance
    const targetUrl = new URL(event.url.pathname + event.url.search, POCKETBASE_URL)

    const proxyHeaders = new Headers()
    for (const [key, value] of event.request.headers) {
      const lower = key.toLowerCase()
      if (
        lower === 'host' ||
        lower === 'connection' ||
        lower === 'keep-alive' ||
        lower === 'transfer-encoding' ||
        lower === 'accept-encoding' ||
        lower === PROXY_SECRET_HEADER
      ) {
        continue
      }
      proxyHeaders.set(key, value)
    }

    // Request uncompressed responses internally so Node fetch does not decompress
    // while forwarding mismatched Content-Length headers, and to avoid compression
    // overhead between local containers.
    proxyHeaders.set('accept-encoding', 'identity')

    proxyHeaders.set('x-forwarded-host', event.url.host)
    proxyHeaders.set('x-forwarded-proto', event.url.protocol.replace(':', ''))
    try {
      const clientIp = event.getClientAddress()
      if (clientIp) {
        proxyHeaders.set('x-forwarded-for', clientIp)
      }
    } catch {
      // Ignore if getClientAddress is not available
    }

    const method = event.request.method
    const hasBody = !['GET', 'HEAD'].includes(method)
    const body = hasBody ? await event.request.arrayBuffer() : undefined

    try {
      const pbRes = await fetch(targetUrl.toString(), {
        method,
        headers: proxyHeaders,
        body,
        // @ts-expect-error duplex is required in node fetch for streaming/buffers
        duplex: hasBody ? 'half' : undefined
      })

      const resHeaders = new Headers()
      for (const [key, value] of pbRes.headers) {
        const lower = key.toLowerCase()
        if (
          lower === 'connection' ||
          lower === 'keep-alive' ||
          lower === 'transfer-encoding' ||
          lower === 'content-encoding' ||
          lower === 'content-length'
        ) {
          continue
        }
        resHeaders.set(key, value)
      }

      return new Response(pbRes.body, {
        status: pbRes.status,
        statusText: pbRes.statusText,
        headers: resHeaders
      })
    } catch (err: any) {
      console.error('PocketBase proxy error:', err)
      return new Response(
        JSON.stringify({ code: 502, message: 'PocketBase backend unavailable.' }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      )
    }
  }

  event.locals.pb = createServerPocketBase(POCKETBASE_URL)

  // Load auth state from request cookie
  event.locals.pb.authStore.loadFromCookie(
    event.request.headers.get('cookie') || '',
  )

  if (event.locals.pb.authStore.isValid) {
    const authUserId = event.locals.pb.authStore.record?.id
    const sessionSig = event.cookies.get(AUTH_SESSION_COOKIE_NAME)

    // Reject PocketBase tokens that did not complete the server login / 2FA flow
    if (!verifyAuthSession(sessionSig, authUserId)) {
      event.locals.pb.authStore.clear()
      clearAuthSessionCookie(event.cookies)
    } else {
      try {
        await event.locals.pb.collection('users').authRefresh()
      } catch {
        event.locals.pb.authStore.clear()
        clearAuthSessionCookie(event.cookies)
      }
    }
  }

  if (event.locals.pb.authStore.isValid && event.locals.pb.authStore.record) {
    const sanitized = sanitizeUser(event.locals.pb.authStore.record)
    event.locals.pb.authStore.save(event.locals.pb.authStore.token, sanitized)
  }

  event.locals.user = event.locals.pb.authStore.record

  const response = await resolve(event)

  if (event.locals.pb.authStore.isValid) {
    const recordToExport =
      event.locals.user?.id === event.locals.pb.authStore.record?.id
        ? event.locals.user
        : event.locals.pb.authStore.record

    if (recordToExport) {
      event.locals.pb.authStore.save(
        event.locals.pb.authStore.token,
        sanitizeUser(recordToExport),
      )
    }
  }

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
  }

  // Update auth cookie in response without overwriting other cookies set during the request.
  // Note: httpOnly remains false because the client-side PocketBase SDK and realtime
  // subscriptions rely on loading the auth state from document.cookie.
  response.headers.append(
    'set-cookie',
    event.locals.pb.authStore.exportToCookie({
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }),
  )

  return response
}
