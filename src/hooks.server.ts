import PocketBase from 'pocketbase'
import type { Handle } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import {
  AUTH_SESSION_COOKIE_NAME,
  clearAuthSessionCookie,
  sanitizeUser,
  verifyAuthSession
} from '@/lib/server/twoFactor'

const POCKETBASE_URL =
  env.VITE_POCKETBASE_URL ||
  process.env.VITE_POCKETBASE_URL ||
  'http://127.0.0.1:8095'

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.pb = new PocketBase(POCKETBASE_URL)

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

  // Update auth cookie in response without overwriting other cookies set during the request
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
