import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import type { TalkRecord } from '@/types/chat'

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login')
  }

  const { talkId } = params

  try {
    const talk = await locals.pb.collection('talks').getOne<TalkRecord>(talkId)
    if (talk.user && talk.user !== locals.user.id) {
      throw error(404, 'Conversa não encontrada')
    }
    return {
      talkId,
      talk: JSON.parse(JSON.stringify(talk)) as TalkRecord
    }
  } catch (err: any) {
    if (err?.status) throw err
    throw error(404, 'Conversa não encontrada')
  }
}
