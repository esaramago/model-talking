import { redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { clearAuthSessionCookie } from '@/lib/server/twoFactor'

export const load: PageServerLoad = async () => {
  throw redirect(303, '/')
}

export const actions: Actions = {
  default: async ({ locals, cookies }) => {
    locals.pb.authStore.clear()
    clearAuthSessionCookie(cookies)
    throw redirect(303, '/login')
  }
}
