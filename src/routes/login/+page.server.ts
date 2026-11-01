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
    const email = (formData.get('email') as string)?.trim() || ''
    const password = (formData.get('password') as string) || ''

    if (!email || !password) {
      return fail(400, {
        email,
        error: 'Por favor preenche todos os campos.'
      })
    }

    try {
      await locals.pb.collection('users').authWithPassword(email, password)
    } catch (err: any) {
      console.error('Login error:', err)
      return fail(400, {
        email,
        error: 'Email ou palavra-passe incorretos.'
      })
    }

    throw redirect(303, '/')
  }
}
