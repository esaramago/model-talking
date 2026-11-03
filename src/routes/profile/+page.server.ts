import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import type { TwoFactorMethod, UserRecord } from '@/types/user'
import {
  generateBase32Secret,
  verifyTOTP,
  buildOtpAuthUri,
  generateEmailOtp,
  sanitizeUser
} from '@/lib/server/twoFactor'

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login')
  }

  let pendingSecret = locals.user.twoFactorPendingSecret as string | undefined
  if (!pendingSecret) {
    pendingSecret = generateBase32Secret()
    try {
      const updated = await locals.pb.collection('users').update(locals.user.id, {
        twoFactorPendingSecret: pendingSecret
      })
      locals.user = updated
    } catch (e) {
      console.error('Failed to save pending 2FA secret:', e)
    }
  }

  const accountEmail = locals.user.email || 'user'
  const otpAuthUri = buildOtpAuthUri('ModelTalking', accountEmail, pendingSecret)

  return {
    user: sanitizeUser(locals.user) as UserRecord,
    authenticatorSetup: {
      secret: pendingSecret,
      otpAuthUri
    }
  }
}

export const actions: Actions = {
  updateName: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    const formData = await request.formData()
    const name = (formData.get('name') as string)?.trim() || ''

    try {
      const updated = await locals.pb.collection('users').update(locals.user.id, { name })
      locals.user = updated
      return {
        action: 'updateName' as const,
        success: true,
        name,
        messageKey: 'profile.nameUpdated' as const
      }
    } catch (err: any) {
      console.error('Update name error:', err)
      return fail(400, {
        action: 'updateName' as const,
        name,
        errorKey: 'profile.updateError' as const
      })
    }
  },

  updateEmail: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    const formData = await request.formData()
    const email = (formData.get('email') as string)?.trim() || ''

    if (!email) {
      return fail(400, {
        action: 'updateEmail' as const,
        email,
        errorKey: 'profile.fillRequired' as const
      })
    }

    if (email === locals.user.email) {
      return fail(400, {
        action: 'updateEmail' as const,
        email,
        errorKey: 'profile.emailUnchanged' as const
      })
    }

    try {
      await locals.pb.collection('users').requestEmailChange(email)
      return {
        action: 'updateEmail' as const,
        success: true,
        email,
        messageKey: 'profile.emailConfirmationSent' as const
      }
    } catch (err: any) {
      console.error('Request email change error:', err)
      return fail(400, {
        action: 'updateEmail' as const,
        email,
        errorKey: 'profile.emailError' as const
      })
    }
  },

  updatePassword: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    const formData = await request.formData()
    const oldPassword = (formData.get('oldPassword') as string) || ''
    const password = (formData.get('password') as string) || ''
    const passwordConfirm = (formData.get('passwordConfirm') as string) || ''

    if (!oldPassword || !password || !passwordConfirm) {
      return fail(400, {
        action: 'updatePassword' as const,
        errorKey: 'profile.fillRequired' as const
      })
    }

    if (password.length < 8) {
      return fail(400, {
        action: 'updatePassword' as const,
        errorKey: 'profile.passwordMinLength' as const
      })
    }

    if (password !== passwordConfirm) {
      return fail(400, {
        action: 'updatePassword' as const,
        errorKey: 'profile.passwordMismatch' as const
      })
    }

    try {
      await locals.pb.collection('users').update(locals.user.id, {
        oldPassword,
        password,
        passwordConfirm
      })

      if (locals.user.email) {
        const authData = await locals.pb.collection('users').authWithPassword(locals.user.email, password)
        locals.user = authData.record
      }

      return {
        action: 'updatePassword' as const,
        success: true,
        messageKey: 'profile.passwordUpdated' as const
      }
    } catch (err: any) {
      console.error('Update password error:', err)
      const pbErrors = err?.response?.data
      if (pbErrors?.oldPassword) {
        return fail(400, {
          action: 'updatePassword' as const,
          errorKey: 'profile.currentPasswordIncorrect' as const
        })
      }

      return fail(400, {
        action: 'updatePassword' as const,
        errorKey: 'profile.passwordError' as const
      })
    }
  },

  sendEmail2FACode: async ({ locals }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    const code = generateEmailOtp()
    const expires = Date.now() + 10 * 60 * 1000 // 10 minutes

    try {
      await locals.pb.collection('users').update(locals.user.id, {
        twoFactorEmailCode: code,
        twoFactorEmailExpires: expires
      })

      console.info(`[2FA Email Code for ${locals.user.email}]: ${code}`)

      return {
        action: 'sendEmail2FACode' as const,
        success: true,
        messageKey: 'profile.emailCodeSent' as const
      }
    } catch (err: any) {
      console.error('Failed to send email 2FA code:', err)
      return fail(400, {
        action: 'sendEmail2FACode' as const,
        errorKey: 'profile.updateError' as const
      })
    }
  },

  enableEmail2FA: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    const formData = await request.formData()
    const code = (formData.get('code') as string)?.trim() || ''

    if (!code) {
      return fail(400, {
        action: 'enableEmail2FA' as const,
        errorKey: 'profile.fillRequired' as const
      })
    }

    const user = await locals.pb.collection('users').getOne(locals.user.id)
    if (!user.twoFactorEmailCode || !user.twoFactorEmailExpires) {
      return fail(400, {
        action: 'enableEmail2FA' as const,
        errorKey: 'profile.codeExpired' as const
      })
    }

    if (Date.now() > Number(user.twoFactorEmailExpires)) {
      return fail(400, {
        action: 'enableEmail2FA' as const,
        errorKey: 'profile.codeExpired' as const
      })
    }

    if (user.twoFactorEmailCode !== code) {
      return fail(400, {
        action: 'enableEmail2FA' as const,
        errorKey: 'profile.invalidCode' as const
      })
    }

    try {
      const updated = await locals.pb.collection('users').update(locals.user.id, {
        twoFactorMethod: 'email',
        twoFactorEmailCode: '',
        twoFactorEmailExpires: 0
      })
      locals.user = updated

      return {
        action: 'enableEmail2FA' as const,
        success: true,
        messageKey: 'profile.twoFactorEnabled' as const
      }
    } catch (err: any) {
      console.error('Enable email 2FA error:', err)
      return fail(400, {
        action: 'enableEmail2FA' as const,
        errorKey: 'profile.updateError' as const
      })
    }
  },

  enableAuthenticator2FA: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    const formData = await request.formData()
    const code = (formData.get('code') as string)?.replace(/\s+/g, '') || ''
    const formSecret = (formData.get('secret') as string)?.trim() || ''

    if (!code) {
      return fail(400, {
        action: 'enableAuthenticator2FA' as const,
        errorKey: 'profile.fillRequired' as const
      })
    }

    const user = await locals.pb.collection('users').getOne(locals.user.id)
    const dbPendingSecret = user.twoFactorPendingSecret || ''

    let verifiedSecret = ''
    if (dbPendingSecret && verifyTOTP(dbPendingSecret, code)) {
      verifiedSecret = dbPendingSecret
    } else if (formSecret && verifyTOTP(formSecret, code)) {
      verifiedSecret = formSecret
    }

    if (!verifiedSecret) {
      return fail(400, {
        action: 'enableAuthenticator2FA' as const,
        errorKey: 'profile.invalidCode' as const
      })
    }

    try {
      const updated = await locals.pb.collection('users').update(locals.user.id, {
        twoFactorMethod: 'authenticator',
        twoFactorSecret: verifiedSecret,
        twoFactorPendingSecret: ''
      })
      locals.user = updated

      return {
        action: 'enableAuthenticator2FA' as const,
        success: true,
        messageKey: 'profile.twoFactorEnabled' as const
      }
    } catch (err: any) {
      console.error('Enable authenticator error:', err)
      return fail(400, {
        action: 'enableAuthenticator2FA' as const,
        errorKey: 'profile.updateError' as const
      })
    }
  },

  disable2FA: async ({ locals }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    try {
      const updated = await locals.pb.collection('users').update(locals.user.id, {
        twoFactorMethod: 'none',
        twoFactorSecret: '',
        twoFactorEmailCode: '',
        twoFactorEmailExpires: 0
      })
      locals.user = updated

      return {
        action: 'disable2FA' as const,
        success: true,
        messageKey: 'profile.twoFactorDisabled' as const
      }
    } catch (err: any) {
      console.error('Disable 2FA error:', err)
      return fail(400, {
        action: 'disable2FA' as const,
        errorKey: 'profile.updateError' as const
      })
    }
  }
}
