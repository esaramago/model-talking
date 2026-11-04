import { fail, redirect } from '@sveltejs/kit'
import PocketBase from 'pocketbase'
import type { Actions, PageServerLoad } from './$types'
import { getPrivilegedPocketBase } from '@/lib/server/pbAdmin'
import { isLoopbackIp } from '@/lib/server/rateLimit'
import {
  verifyTOTP,
  verifyOtpCode,
  createPending2FAToken,
  verifyPending2FAToken,
  sanitizeUser,
  setAuthSessionCookie,
  clearAuthSessionCookie,
  isAuthRateLimited,
  recordFailedAuthAttempt,
  clearAuthAttempts
} from '@/lib/server/twoFactor'

function safeGetClientIp(getClientAddress: () => string): string {
  try {
    return getClientAddress()
  } catch {
    return '127.0.0.1'
  }
}

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

    const clientIp = safeGetClientIp(getClientAddress)
    const isLoopback = isLoopbackIp(clientIp)
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

      cookies.set('mt_2fa_pending', pendingToken, {
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
    const token = cookies.get('mt_2fa_pending') || ''

    if (!token) {
      return fail(400, {
        step: 'twoFactor' as const,
        errorKey: 'login.codeExpired' as const
      })
    }

    const pending = verifyPending2FAToken(token)
    if (!pending) {
      cookies.delete('mt_2fa_pending', { path: '/' })
      return fail(400, {
        step: 'twoFactor' as const,
        errorKey: 'login.codeExpired' as const
      })
    }

    if (Date.now() - pending.timestamp > 10 * 60 * 1000) {
      cookies.delete('mt_2fa_pending', { path: '/' })
      return fail(400, {
        step: 'twoFactor' as const,
        errorKey: 'login.codeExpired' as const
      })
    }

    const clientIp = safeGetClientIp(getClientAddress)
    const isLoopback = isLoopbackIp(clientIp)
    const userAttemptKey = `2fa:user:${pending.userId}`
    const ipAttemptKey = `2fa:ip:${clientIp}`

    const ipLimited = !isLoopback && (await isAuthRateLimited(ipAttemptKey, 50))
    const userLimited = await isAuthRateLimited(userAttemptKey, 5)

    if (userLimited || ipLimited) {
      cookies.delete('mt_2fa_pending', { path: '/' })
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
      cookies.delete('mt_2fa_pending', { path: '/' })
      return fail(400, {
        step: 'twoFactor' as const,
        errorKey: 'login.codeExpired' as const
      })
    }

    if (pending.method === 'authenticator') {
      const secret = user.twoFactorSecret || ''
      if (!secret || !verifyTOTP(secret, code)) {
        const { locked } = await recordFailedAuthAttempt(userAttemptKey, 5)
        if (!isLoopback) {
          await recordFailedAuthAttempt(ipAttemptKey, 50)
        }
        if (locked) {
          cookies.delete('mt_2fa_pending', { path: '/' })
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
          const authPb = new PocketBase(locals.pb.baseUrl)
          const otpAuth = await authPb.collection('users').authWithOTP(pending.otpId, code)
          otpValid = otpAuth.record?.id === pending.userId
        } catch {
          otpValid = false
        }
      } else if (user.twoFactorEmailCode && user.twoFactorEmailExpires) {
        if (
          Date.now() <= Number(user.twoFactorEmailExpires) &&
          verifyOtpCode(String(user.twoFactorEmailCode), code)
        ) {
          otpValid = true
        }
      }

      if (!otpValid) {
        const { locked } = await recordFailedAuthAttempt(userAttemptKey, 5)
        if (!isLoopback) {
          await recordFailedAuthAttempt(ipAttemptKey, 50)
        }
        if (locked) {
          cookies.delete('mt_2fa_pending', { path: '/' })
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

      if (user.twoFactorEmailCode) {
        await privilegedPb.collection('users').update(user.id, {
          twoFactorEmailCode: '',
          twoFactorEmailExpires: 0
        })
      }
    } else {
      locals.pb.authStore.clear()
      clearAuthSessionCookie(cookies)
      cookies.delete('mt_2fa_pending', { path: '/' })
      throw redirect(303, '/login')
    }

    try {
      locals.pb.authStore.save(pending.pbToken, sanitizeUser(user))
      await locals.pb.collection('users').authRefresh()
    } catch {
      locals.pb.authStore.clear()
      cookies.delete('mt_2fa_pending', { path: '/' })
      return fail(400, {
        step: 'twoFactor' as const,
        errorKey: 'login.codeExpired' as const
      })
    }

    await clearAuthAttempts(userAttemptKey)
    if (!isLoopback) {
      await clearAuthAttempts(ipAttemptKey)
    }
    cookies.delete('mt_2fa_pending', { path: '/' })
    setAuthSessionCookie(cookies, user.id)

    throw redirect(303, '/')
  },

  cancelTwoFactor: async ({ cookies }) => {
    cookies.delete('mt_2fa_pending', { path: '/' })
    throw redirect(303, '/login')
  }
}
