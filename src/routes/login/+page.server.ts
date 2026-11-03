import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import {
  verifyTOTP,
  generateEmailOtp,
  createPending2FAToken,
  verifyPending2FAToken
} from '@/lib/server/twoFactor'

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, '/')
  }
}

export const actions: Actions = {
  login: async ({ request, locals, cookies }) => {
    const formData = await request.formData()
    const email = (formData.get('email') as string)?.trim() || ''
    const password = (formData.get('password') as string) || ''

    if (!email || !password) {
      return fail(400, {
        email,
        error: 'Por favor preenche todos os campos.'
      })
    }

    try {
      const authData = await locals.pb.collection('users').authWithPassword(email, password)
      const user = authData.record

      const twoFactorMethod = user.twoFactorMethod || 'none'

      if (twoFactorMethod === 'none') {
        throw redirect(303, '/')
      }

      if (twoFactorMethod === 'email') {
        const code = generateEmailOtp()
        const expires = Date.now() + 10 * 60 * 1000 // 10 minutes

        await locals.pb.collection('users').update(user.id, {
          twoFactorEmailCode: code,
          twoFactorEmailExpires: expires
        })

        console.info(`[2FA Login Email Code for ${email}]: ${code}`)
      }

      // Clear auth token so user is not logged in until 2FA is verified
      locals.pb.authStore.clear()

      const pendingToken = createPending2FAToken({
        userId: user.id,
        email,
        password,
        method: twoFactorMethod,
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
        email,
        pendingToken
      }
    } catch (err: any) {
      if (err?.status === 303 || err?.location) {
        throw err
      }

      console.error('Login error:', err)
      return fail(400, {
        email,
        error: 'Email ou palavra-passe incorretos.'
      })
    }
  },

  verifyTwoFactor: async ({ request, locals, cookies }) => {
    const formData = await request.formData()
    const token =
      ((formData.get('pendingToken') as string)?.trim() || '') ||
      cookies.get('mt_2fa_pending') ||
      ''

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

    const code = (formData.get('code') as string)?.replace(/\s+/g, '') || ''

    if (!code) {
      return fail(400, {
        step: 'twoFactor' as const,
        twoFactorMethod: pending.method,
        pendingToken: token,
        errorKey: 'login.invalidCode' as const
      })
    }

    let user
    try {
      const authData = await locals.pb.collection('users').authWithPassword(pending.email, pending.password)
      user = authData.record
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
        locals.pb.authStore.clear()
        return fail(400, {
          step: 'twoFactor' as const,
          twoFactorMethod: pending.method,
          pendingToken: token,
          errorKey: 'login.invalidCode' as const
        })
      }
    } else if (pending.method === 'email') {
      if (!user.twoFactorEmailCode || !user.twoFactorEmailExpires) {
        locals.pb.authStore.clear()
        return fail(400, {
          step: 'twoFactor' as const,
          twoFactorMethod: pending.method,
          pendingToken: token,
          errorKey: 'login.codeExpired' as const
        })
      }

      if (Date.now() > Number(user.twoFactorEmailExpires)) {
        locals.pb.authStore.clear()
        return fail(400, {
          step: 'twoFactor' as const,
          twoFactorMethod: pending.method,
          pendingToken: token,
          errorKey: 'login.codeExpired' as const
        })
      }

      if (user.twoFactorEmailCode !== code) {
        locals.pb.authStore.clear()
        return fail(400, {
          step: 'twoFactor' as const,
          twoFactorMethod: pending.method,
          pendingToken: token,
          errorKey: 'login.invalidCode' as const
        })
      }

      await locals.pb.collection('users').update(user.id, {
        twoFactorEmailCode: '',
        twoFactorEmailExpires: 0
      })
    } else {
      locals.pb.authStore.clear()
      cookies.delete('mt_2fa_pending', { path: '/' })
      throw redirect(303, '/login')
    }

    cookies.delete('mt_2fa_pending', { path: '/' })

    throw redirect(303, '/')
  },

  cancelTwoFactor: async ({ cookies }) => {
    cookies.delete('mt_2fa_pending', { path: '/' })
    throw redirect(303, '/login')
  }
}
