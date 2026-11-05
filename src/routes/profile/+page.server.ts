import { fail, redirect, type Cookies } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import type { UserRecord } from '@/types/user'
import { getPrivilegedPocketBase } from '@/lib/server/pbAdmin'
import { createServerPocketBase } from '@/lib/server/pocketbase'
import {
  generateBase32Secret,
  verifyAndConsumeTOTP,
  encryptTwoFactorSecret,
  decryptTwoFactorSecret,
  PENDING_TOTP_COOKIE_NAME,
  PROFILE_OTP_COOKIE_NAME,
  createPendingTotpToken,
  verifyPendingTotpToken,
  buildOtpAuthUri,
  sanitizeUser,
  setAuthSessionCookie,
  clearAuthSessionCookie,
  createProfileOtpToken,
  verifyProfileOtpToken,
  isAuthRateLimited,
  recordFailedAuthAttempt,
  clearAuthAttempts
} from '@/lib/server/twoFactor'

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login')
  }

  return {
    user: sanitizeUser(locals.user) as UserRecord
  }
}

/**
 * Returns the pending TOTP secret for the user, creating and persisting one on first use.
 * Only called when the user actually starts the authenticator setup.
 */
async function getOrCreatePendingSecret(
  locals: App.Locals,
  cookies: Cookies,
  userId: string
): Promise<string> {
  const privilegedPb = await getPrivilegedPocketBase(locals.pb)
  let pendingSecret = ''

  try {
    const fullUser = await privilegedPb.collection('users').getOne(userId)
    pendingSecret = decryptTwoFactorSecret(fullUser.twoFactorPendingSecret as string | undefined)
  } catch {
    pendingSecret = decryptTwoFactorSecret(locals.user?.twoFactorPendingSecret as string | undefined)
  }

  if (!pendingSecret) {
    pendingSecret = verifyPendingTotpToken(cookies.get(PENDING_TOTP_COOKIE_NAME), userId) || ''
  }

  if (!pendingSecret) {
    pendingSecret = generateBase32Secret()
    try {
      const updated = await privilegedPb.collection('users').update(userId, {
        twoFactorPendingSecret: encryptTwoFactorSecret(pendingSecret)
      })
      locals.user = sanitizeUser(updated)
    } catch (e) {
      console.error('Failed to save pending 2FA secret:', e)
    }
  }

  cookies.set(PENDING_TOTP_COOKIE_NAME, createPendingTotpToken(userId, pendingSecret), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 30,
    secure: process.env.NODE_ENV === 'production'
  })

  return pendingSecret
}

export const actions: Actions = {
  startAuthenticatorSetup: async ({ locals, cookies }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    try {
      const secret = await getOrCreatePendingSecret(locals, cookies, locals.user.id)
      return {
        action: 'startAuthenticatorSetup' as const,
        authenticatorSetup: {
          secret,
          otpAuthUri: buildOtpAuthUri('ModelTalking', locals.user.email || 'user', secret)
        }
      }
    } catch (err: any) {
      console.error('Start authenticator setup error:', err)
      return fail(400, {
        action: 'startAuthenticatorSetup' as const,
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

  updatePassword: async ({ request, locals, cookies }) => {
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
        locals.user = sanitizeUser(authData.record)
        setAuthSessionCookie(cookies, authData.record.id)
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

  sendEmail2FACode: async ({ locals, cookies }) => {
    if (!locals.user || !locals.user.email) {
      throw redirect(303, '/login')
    }

    const sendAttemptKey = `profile2fa:send:${locals.user.id}`
    if (await isAuthRateLimited(sendAttemptKey, 5)) {
      return fail(429, {
        action: 'sendEmail2FACode' as const,
        errorKey: 'profile.updateError' as const
      })
    }

    try {
      await recordFailedAuthAttempt(sendAttemptKey, 5)
      const otpResponse = await locals.pb.collection('users').requestOTP(locals.user.email)

      if (otpResponse?.otpId) {
        const signedOtpToken = createProfileOtpToken(locals.user.id, otpResponse.otpId)
        cookies.set(PROFILE_OTP_COOKIE_NAME, signedOtpToken, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 10,
          secure: process.env.NODE_ENV === 'production'
        })
      }

      return {
        action: 'sendEmail2FACode' as const,
        success: true,
        messageKey: 'profile.emailCodeSent' as const
      }
    } catch (err: any) {
      console.error('Failed to send email 2FA code via PocketBase:', err)
      return fail(400, {
        action: 'sendEmail2FACode' as const,
        errorKey: 'profile.updateError' as const
      })
    }
  },

  enableEmail2FA: async ({ request, locals, cookies }) => {
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

    const attemptKey = `profile2fa:email:${locals.user.id}`
    const sendAttemptKey = `profile2fa:send:${locals.user.id}`
    const privilegedPb = await getPrivilegedPocketBase(locals.pb)

    if (await isAuthRateLimited(attemptKey)) {
      cookies.delete(PROFILE_OTP_COOKIE_NAME, { path: '/' })
      return fail(429, {
        action: 'enableEmail2FA' as const,
        errorKey: 'profile.codeExpired' as const
      })
    }

    const storedOtpToken = cookies.get(PROFILE_OTP_COOKIE_NAME)
    const storedOtpId = verifyProfileOtpToken(storedOtpToken, locals.user.id)
    let verified = false

    if (storedOtpId) {
      try {
        const authPb = createServerPocketBase(locals.pb.baseUrl)
        const otpAuth = await authPb.collection('users').authWithOTP(storedOtpId, code)
        verified = otpAuth.record?.id === locals.user.id
      } catch {
        verified = false
      }
    }

    if (!verified) {
      const { locked } = await recordFailedAuthAttempt(attemptKey)
      if (locked) {
        cookies.delete(PROFILE_OTP_COOKIE_NAME, { path: '/' })
        return fail(429, {
          action: 'enableEmail2FA' as const,
          errorKey: 'profile.codeExpired' as const
        })
      }
      return fail(400, {
        action: 'enableEmail2FA' as const,
        errorKey: 'profile.invalidCode' as const
      })
    }

    cookies.delete(PROFILE_OTP_COOKIE_NAME, { path: '/' })

    try {
      const updated = await privilegedPb.collection('users').update(locals.user.id, {
        twoFactorMethod: 'email'
      })
      await clearAuthAttempts(attemptKey)
      await clearAuthAttempts(sendAttemptKey)
      locals.user = sanitizeUser(updated)
      setAuthSessionCookie(cookies, locals.user.id)

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

  enableAuthenticator2FA: async ({ request, locals, cookies }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    const formData = await request.formData()
    const code = (formData.get('code') as string)?.replace(/\s+/g, '') || ''

    if (!code) {
      return fail(400, {
        action: 'enableAuthenticator2FA' as const,
        errorKey: 'profile.fillRequired' as const
      })
    }

    const attemptKey = `profile2fa:totp:${locals.user.id}`
    if (await isAuthRateLimited(attemptKey)) {
      return fail(429, {
        action: 'enableAuthenticator2FA' as const,
        errorKey: 'profile.invalidCode' as const
      })
    }

    const privilegedPb = await getPrivilegedPocketBase(locals.pb)
    const user = await privilegedPb.collection('users').getOne(locals.user.id)
    const dbPendingSecret = decryptTwoFactorSecret(user.twoFactorPendingSecret)
    const cookiePendingSecret =
      verifyPendingTotpToken(cookies.get(PENDING_TOTP_COOKIE_NAME), locals.user.id) || ''

    let verifiedSecret = ''
    if (dbPendingSecret && (await verifyAndConsumeTOTP(locals.user.id, dbPendingSecret, code))) {
      verifiedSecret = dbPendingSecret
    } else if (
      !dbPendingSecret &&
      cookiePendingSecret &&
      (await verifyAndConsumeTOTP(locals.user.id, cookiePendingSecret, code))
    ) {
      verifiedSecret = cookiePendingSecret
    }

    if (!verifiedSecret) {
      await recordFailedAuthAttempt(attemptKey)
      return fail(400, {
        action: 'enableAuthenticator2FA' as const,
        errorKey: 'profile.invalidCode' as const
      })
    }

    cookies.delete(PENDING_TOTP_COOKIE_NAME, { path: '/' })

    try {
      const updated = await privilegedPb.collection('users').update(locals.user.id, {
        twoFactorMethod: 'authenticator',
        twoFactorSecret: encryptTwoFactorSecret(verifiedSecret),
        twoFactorPendingSecret: ''
      })
      await clearAuthAttempts(attemptKey)
      locals.user = sanitizeUser(updated)
      setAuthSessionCookie(cookies, locals.user.id)

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

  disable2FA: async ({ request, locals, cookies }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    const formData = await request.formData()
    const currentPassword = (formData.get('currentPassword') as string) || ''
    const code = (formData.get('code') as string)?.replace(/\s+/g, '') || ''

    if (!currentPassword && !code) {
      return fail(400, {
        action: 'disable2FA' as const,
        errorKey: 'profile.fillRequired' as const
      })
    }

    const attemptKey = `profile2fa:disable:${locals.user.id}`
    if (await isAuthRateLimited(attemptKey)) {
      return fail(429, {
        action: 'disable2FA' as const,
        errorKey: currentPassword
          ? ('profile.currentPasswordIncorrect' as const)
          : ('profile.invalidCode' as const)
      })
    }

    const privilegedPb = await getPrivilegedPocketBase(locals.pb)
    const user = await privilegedPb.collection('users').getOne(locals.user.id)
    const userEmail = user.email || locals.user.email || ''

    let verified = false

    if (currentPassword && userEmail) {
      try {
        const authPb = createServerPocketBase(locals.pb.baseUrl)
        await authPb.collection('users').authWithPassword(userEmail, currentPassword)
        verified = true
      } catch {
        verified = false
      }
    }

    if (!verified && code) {
      const decryptedSecret = decryptTwoFactorSecret(user.twoFactorSecret)
      if (user.twoFactorMethod === 'authenticator' && decryptedSecret) {
        verified = await verifyAndConsumeTOTP(locals.user.id, decryptedSecret, code)
      }
    }

    if (!verified) {
      await recordFailedAuthAttempt(attemptKey)
      return fail(400, {
        action: 'disable2FA' as const,
        errorKey: currentPassword
          ? ('profile.currentPasswordIncorrect' as const)
          : ('profile.invalidCode' as const)
      })
    }

    cookies.delete(PENDING_TOTP_COOKIE_NAME, { path: '/' })

    try {
      const updated = await privilegedPb.collection('users').update(locals.user.id, {
        twoFactorMethod: 'none',
        twoFactorSecret: '',
        twoFactorPendingSecret: ''
      })
      await clearAuthAttempts(attemptKey)
      locals.user = sanitizeUser(updated)
      setAuthSessionCookie(cookies, locals.user.id)

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
  },

  deleteAccount: async ({ request, locals, cookies }) => {
    if (!locals.user) {
      throw redirect(303, '/login')
    }

    const formData = await request.formData()
    const password = (formData.get('password') as string) || ''

    if (!password) {
      return fail(400, {
        action: 'deleteAccount' as const,
        errorKey: 'profile.fillRequired' as const
      })
    }

    const privilegedPb = await getPrivilegedPocketBase(locals.pb)
    const user = await privilegedPb.collection('users').getOne(locals.user.id)
    const userEmail = user.email || locals.user.email || ''

    try {
      const authPb = createServerPocketBase(locals.pb.baseUrl)
      await authPb.collection('users').authWithPassword(userEmail, password)
    } catch {
      return fail(400, {
        action: 'deleteAccount' as const,
        errorKey: 'profile.currentPasswordIncorrect' as const
      })
    }

    const userId = locals.user.id

    try {
      try {
        const userTalks = await privilegedPb.collection('talks').getFullList({
          filter: `user = "${userId}"`,
          fields: 'id'
        })
        for (const talk of userTalks) {
          await privilegedPb.collection('talks').delete(talk.id).catch(() => {})
        }
      } catch (err) {
        console.warn('Failed to clean up user talks during account deletion:', err)
      }

      await privilegedPb.collection('users').delete(userId)
    } catch (err: any) {
      console.error('Delete account error:', err)
      return fail(400, {
        action: 'deleteAccount' as const,
        errorKey: 'profile.deleteAccountError' as const
      })
    }

    cookies.delete(PENDING_TOTP_COOKIE_NAME, { path: '/' })
    cookies.delete(PROFILE_OTP_COOKIE_NAME, { path: '/' })
    locals.pb.authStore.clear()
    clearAuthSessionCookie(cookies)

    throw redirect(303, '/login')
  }
}
