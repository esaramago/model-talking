import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  // If already authenticated, redirect to home
  if (locals.user) {
    throw redirect(303, '/')
  }
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
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

    try {
      const createData: Record<string, string> = {
        email,
        password,
        passwordConfirm
      }
      if (name) {
        createData.name = name
      }

      await locals.pb.collection('users').create(createData)
      await locals.pb.collection('users').authWithPassword(email, password)
    } catch (err: any) {
      console.error('Registration error:', err)
      let message = 'Não foi possível criar a conta. Tenta novamente.'

      const pbErrors = err?.response?.data
      if (pbErrors?.email?.message) {
        message = 'Este email já se encontra registado ou é inválido.'
      } else if (pbErrors?.password?.message) {
        message = 'A palavra-passe não cumpre os requisitos mínimos.'
      } else if (err?.message) {
        message = err.message
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
