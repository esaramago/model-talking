import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { isLoopbackIp } from '@/lib/server/rateLimit'
import {
  isAuthRateLimited,
  recordFailedAuthAttempt,
  setAuthSessionCookie
} from '@/lib/server/twoFactor'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function safeGetClientIp(getClientAddress: () => string): string {
  try {
    return getClientAddress()
  } catch {
    return '127.0.0.1'
  }
}

export const load: PageServerLoad = async ({ locals }) => {
  // If already authenticated, redirect to home
  if (locals.user) {
    throw redirect(303, '/')
  }
}

export const actions: Actions = {
  default: async ({ request, locals, cookies, getClientAddress }) => {
    const clientIp = safeGetClientIp(getClientAddress)
    const isLoopback = isLoopbackIp(clientIp)
    const ipLimitKey = `register:ip:${clientIp}`

    // Throttle registration requests per IP to protect against bulk automated account creation (bypassed for loopback)
    if (!isLoopback && (await isAuthRateLimited(ipLimitKey, 10))) {
      return fail(429, {
        name: '',
        email: '',
        error: 'Demasiadas tentativas de registo. Por favor aguarda alguns minutos.'
      })
    }

    const formData = await request.formData()
    const name = (formData.get('name') as string)?.trim() || ''
    const email = (formData.get('email') as string)?.trim() || ''
    const password = (formData.get('password') as string) || ''
    const passwordConfirm = (formData.get('passwordConfirm') as string) || ''

    if (!email || !password || !passwordConfirm) {
      return fail(400, {
        name,
        email,
        error: 'Por favor preenche todos os campos obrigatórios.'
      })
    }

    if (!EMAIL_REGEX.test(email)) {
      return fail(400, {
        name,
        email,
        error: 'Por favor introduz um endereço de email válido.'
      })
    }

    if (password.length < 8) {
      return fail(400, {
        name,
        email,
        error: 'A palavra-passe deve ter pelo menos 8 caracteres.'
      })
    }

    if (password !== passwordConfirm) {
      return fail(400, {
        name,
        email,
        error: 'As palavras-passe não coincidem.'
      })
    }

    // Record attempt to throttle automated registration bursts (skipped for loopback)
    if (!isLoopback) {
      await recordFailedAuthAttempt(ipLimitKey, 10, 15 * 60 * 1000)
    }

    try {
      const createData: Record<string, string> = {
        email,
        password,
        passwordConfirm,
        role: 'user'
      }
      if (name) {
        createData.name = name
      }

      await locals.pb.collection('users').create(createData)

      // Request email verification if PocketBase mailer is configured
      try {
        await locals.pb.collection('users').requestVerification(email)
      } catch {
        // Safe to ignore if mailer is unconfigured
      }

      const authData = await locals.pb.collection('users').authWithPassword(email, password)
      setAuthSessionCookie(cookies, authData.record.id)
    } catch (err: any) {
      console.error('Registration error:', err)
      let message = 'Não foi possível concluir o registo. Por favor tenta novamente.'

      const pbErrors = err?.response?.data
      if (pbErrors?.email) {
        // Prevent email enumeration by returning a generic non-leaking message
        message = 'Não foi possível concluir o registo. Por favor verifica os dados introduzidos ou tenta iniciar sessão.'
      } else if (pbErrors?.password?.message) {
        message = 'A palavra-passe não cumpre os requisitos mínimos.'
      }

      return fail(400, {
        name,
        email,
        error: message
      })
    }

    throw redirect(303, '/')
  }
}
