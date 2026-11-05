import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { getPrivilegedPocketBase } from '@/lib/server/pbAdmin'
import { createServerPocketBase } from '@/lib/server/pocketbase'
import { isIpLimitExempt, resolveClientIp } from '@/lib/server/rateLimit'
import {
  verifyAndConsumeTOTP,
  decryptTwoFactorSecret,
  PENDING_2FA_COOKIE_NAME,
  createPending2FAToken,
  verifyPending2FAToken,
  sanitizeUser,
  setAuthSessionCookie,
  clearAuthSessionCookie,
  isAuthRateLimited,
  recordFailedAuthAttempt,
  clearAuthAttempts
} from '@/lib/server/twoFactor'

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, '/')
  }
}

export const actions: Actions = {
  login: async ({ request, locals, cookies, getClientAddress }) => {
    const formData = await request.formData()
    const email = (formData.get('email') as string)?.trim() || ''
    const password = (formData.get('password') as string) || ''

    if (!email || !password) {
      return fail(400, {
        email,
        error: 'Por favor preenche todos os campos.'
      })
    }

    const clientIp = resolveClientIp(getClientAddress)
    const isLoopback = isIpLimitExempt(clientIp)
    const ipLimitKey = `login:ip:${clientIp}`
    const emailLimitKey = `login:email:${email.toLowerCase()}`

    const ipLimited = !isLoopback && (await isAuthRateLimited(ipLimitKey, 50))
    const emailLimited = await isAuthRateLimited(emailLimitKey, 5)

    if (ipLimited || emailLimited) {
      return fail(429, {
        email,
        error: 'Demasiadas tentativas. Por favor aguarda alguns minutos.'
      })
    }

    try {
      const authData = await locals.pb.collection('users').authWithPassword(email, password)
      const user = authData.record

      if (!isLoopback) {
        await clearAuthAttempts(ipLimitKey)
      }
      await clearAuthAttempts(emailLimitKey)

      const twoFactorMethod = user.twoFactorMethod || 'none'

      if (twoFactorMethod === 'none') {
        setAuthSessionCookie(cookies, user.id)
        throw redirect(303, '/')
      }

      const pbToken = authData.token

      // Clear auth token so user is not logged in until 2FA is verified
      locals.pb.authStore.clear()
      clearAuthSessionCookie(cookies)

      let otpId: string | undefined

      if (twoFactorMethod === 'email') {
        try {
          const otpResponse = await locals.pb.collection('users').requestOTP(email)
          otpId = otpResponse?.otpId
        } catch (otpErr) {
          console.error('PocketBase requestOTP failed:', otpErr)
          return fail(500, {
            email,
            error: 'Não foi possível enviar o código de verificação por email.'
          })
        }
      }

      const pendingToken = createPending2FAToken({
        userId: user.id,
        pbToken,
        method: twoFactorMethod,
        otpId,
        timestamp: Date.now()
      })

      cookies.set(PENDING_2FA_COOKIE_NAME, pendingToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 10,
        secure: process.env.NODE_ENV === 'production'
      })

      return {
        step: 'twoFactor' as const,
        twoFactorMethod,
        email
      }
    } catch (err: any) {
      if (err?.status === 303 || err?.location) {
        throw err
      }

      if (!isLoopback) {
        await recordFailedAuthAttempt(ipLimitKey, 50)
      }
      await recordFailedAuthAttempt(emailLimitKey, 5)

      console.error('Login error:', err)
      return fail(400, {
        email,
        error: 'Email ou palavra-passe incorretos.'
      })
    }
  },

  verifyTwoFactor: async ({ request, locals, cookies, getClientAddress }) => {
    const formData = await request.formData()
    const token = cookies.get(PENDING_2FA_COOKIE_NAME) || ''

    const pending = verifyPending2FAToken(token)
    if (!pending) {
      if (token) cookies.delete(PENDING_2FA_COOKIE_NAME, { path: '/' })
      return fail(400, {
        step: 'twoFactor' as const,
        errorKey: 'login.codeExpired' as const
      })
    }

    const clientIp = resolveClientIp(getClientAddress)
    const isLoopback = isIpLimitExempt(clientIp)
    const userAttemptKey = `2fa:user:${pending.userId}`
    const ipAttemptKey = `2fa:ip:${clientIp}`

    const ipLimited = !isLoopback && (await isAuthRateLimited(ipAttemptKey, 50))
    const userLimited = await isAuthRateLimited(userAttemptKey, 5)

    if (userLimited || ipLimited) {
      cookies.delete(PENDING_2FA_COOKIE_NAME, { path: '/' })
      return fail(429, {
        step: 'twoFactor' as const,
        errorKey: 'login.codeExpired' as const
      })
    }

    const code = (formData.get('code') as string)?.replace(/\s+/g, '') || ''

    if (!code) {
      return fail(400, {
        step: 'twoFactor' as const,
        twoFactorMethod: pending.method,
        errorKey: 'login.invalidCode' as const
      })
    }

    let user
    let privilegedPb
    try {
      privilegedPb = await getPrivilegedPocketBase(locals.pb)
      user = await privilegedPb.collection('users').getOne(pending.userId)
    } catch {
      cookies.delete(PENDING_2FA_COOKIE_NAME, { path: '/' })
      return fail(400, {
        step: 'twoFactor' as const,
        errorKey: 'login.codeExpired' as const
      })
    }

    if (pending.method === 'authenticator') {
      const secret = decryptTwoFactorSecret(user.twoFactorSecret)
      if (!secret || !(await verifyAndConsumeTOTP(user.id, secret, code))) {
        const { locked } = await recordFailedAuthAttempt(userAttemptKey, 5)
        if (!isLoopback) {
          await recordFailedAuthAttempt(ipAttemptKey, 50)
        }
        if (locked) {
          cookies.delete(PENDING_2FA_COOKIE_NAME, { path: '/' })
          return fail(429, {
            step: 'twoFactor' as const,
            errorKey: 'login.codeExpired' as const
          })
        }
        return fail(400, {
          step: 'twoFactor' as const,
          twoFactorMethod: pending.method,
          errorKey: 'login.invalidCode' as const
        })
      }
    } else if (pending.method === 'email') {
      let otpValid = false

      if (pending.otpId) {
        try {
          const authPb = createServerPocketBase(locals.pb.baseUrl)
          const otpAuth = await authPb.collection('users').authWithOTP(pending.otpId, code)
          otpValid = otpAuth.record?.id === pending.userId
        } catch {
          otpValid = false
        }
      }

      if (!otpValid) {
        const { locked } = await recordFailedAuthAttempt(userAttemptKey, 5)
        if (!isLoopback) {
          await recordFailedAuthAttempt(ipAttemptKey, 50)
        }
        if (locked) {
          cookies.delete(PENDING_2FA_COOKIE_NAME, { path: '/' })
          return fail(429, {
            step: 'twoFactor' as const,
            errorKey: 'login.codeExpired' as const
          })
        }
        return fail(400, {
          step: 'twoFactor' as const,
          twoFactorMethod: pending.method,
          errorKey: 'login.invalidCode' as const
        })
      }
    } else {
      locals.pb.authStore.clear()
      clearAuthSessionCookie(cookies)
      cookies.delete(PENDING_2FA_COOKIE_NAME, { path: '/' })
      throw redirect(303, '/login')
    }

    try {
      locals.pb.authStore.save(pending.pbToken, sanitizeUser(user))
      await locals.pb.collection('users').authRefresh()
    } catch {
      locals.pb.authStore.clear()
      cookies.delete(PENDING_2FA_COOKIE_NAME, { path: '/' })
      return fail(400, {
        step: 'twoFactor' as const,
        errorKey: 'login.codeExpired' as const
      })
    }

    await clearAuthAttempts(userAttemptKey)
    if (!isLoopback) {
      await clearAuthAttempts(ipAttemptKey)
    }
    cookies.delete(PENDING_2FA_COOKIE_NAME, { path: '/' })
    setAuthSessionCookie(cookies, user.id)

    throw redirect(303, '/')
  },

  cancelTwoFactor: async ({ cookies }) => {
    cookies.delete(PENDING_2FA_COOKIE_NAME, { path: '/' })
    throw redirect(303, '/login')
  }
}
