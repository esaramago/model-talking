import type { LayoutServerLoad } from './$types'
import type { TalkRecord } from '@/types/chat'
import { getQuota, resolveRateLimitIdentifier } from '@/lib/server/rateLimit'
import { sanitizeUser } from '@/lib/server/twoFactor'

export const load: LayoutServerLoad = async (event) => {
  const { locals } = event
  const user = locals.user ? sanitizeUser(locals.user) : null
  const identifier = resolveRateLimitIdentifier(event)
  const quota = await getQuota(locals.pb, identifier)

  if (!user) {
    return {
      talks: [],
      user: null,
      quota
    }
  }

  try {
    const talks = await locals.pb.collection('talks').getFullList<TalkRecord>({
      filter: locals.pb.filter('user = {:userId}', { userId: user.id }),
      sort: '-created'
    })
    return {
      talks: JSON.parse(JSON.stringify(talks)) as TalkRecord[],
      user,
      quota
    }
  } catch (err) {
    console.error('Error in layout load talks:', err)
    return {
      talks: [],
      user,
      quota
    }
  }
}
