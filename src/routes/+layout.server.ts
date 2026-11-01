import type { LayoutServerLoad } from './$types'
import type { TalkRecord } from '@/types/chat'

export const load: LayoutServerLoad = async ({ locals }) => {
  const user = locals.user ? JSON.parse(JSON.stringify(locals.user)) : null

  if (!user) {
    return {
      talks: [],
      user: null
    }
  }

  try {
    const talks = await locals.pb.collection('talks').getFullList<TalkRecord>({
      filter: locals.pb.filter('user = {:userId}', { userId: user.id }),
      sort: '-created'
    })
    return {
      talks: JSON.parse(JSON.stringify(talks)) as TalkRecord[],
      user
    }
  } catch (err) {
    console.error('Error in layout load talks:', err)
    return {
      talks: [],
      user
    }
  }
}
