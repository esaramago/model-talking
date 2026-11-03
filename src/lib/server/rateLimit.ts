import crypto from 'node:crypto'
import type PocketBase from 'pocketbase'
import type { RequestEvent } from '@sveltejs/kit'
import { DAILY_MESSAGE_LIMIT, DAILY_TITLE_LIMIT } from '@/lib/config'

export { DAILY_MESSAGE_LIMIT, DAILY_TITLE_LIMIT }
export const INTERNAL_SECRET_KEY =
  process.env.INTERNAL_SECRET_KEY || 'mt_secret_daily_usage_key_8f3a1e'

const GUEST_COOKIE_NAME = 'mt_guest_token'
const COOKIE_SECRET =
  process.env.RATE_LIMIT_SECRET ||
  process.env.OPENROUTER_API_KEY ||
  'mt_cookie_signing_salt_2026'

export interface QuotaInfo {
  remaining: number
  total: number
  isUnlimited: boolean
  resetAt: string
}

export interface RateLimitIdentifier {
  isAdmin: boolean
  userKey?: string
  cookieKey: string
  ipKey: string
}

// In-memory fallback and cache to optimize reads and handle offline edge cases
const memoryUsage = new Map<string, { date: string; count: number }>()

export function getUtcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function getResetAtUtc(date: Date = new Date()): string {
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0)
  )
  return next.toISOString()
}

/**
 * Signs a guest ID with HMAC-SHA256 to prevent client-side cookie tampering.
 */
function signGuestId(id: string): string {
  const hmac = crypto.createHmac('sha256', COOKIE_SECRET).update(id).digest('hex')
  return `${id}.${hmac}`
}

/**
 * Validates the HMAC signature of a guest token.
 */
function verifyGuestToken(token: string | undefined): string | null {
  if (!token || !token.includes('.')) return null
  const [id, signature] = token.split('.')
  if (!id || !signature) return null

  const expected = crypto.createHmac('sha256', COOKIE_SECRET).update(id).digest('hex')
  const sigBuffer = Buffer.from(signature)
  const expBuffer = Buffer.from(expected)

  if (sigBuffer.length !== expBuffer.length) return null
  if (crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return id
  }
  return null
}

/**
 * Extracts the real client IP address from proxy headers or connection.
 */
function extractClientIp(event: RequestEvent): string {
  const forwarded = event.request.headers.get('x-forwarded-for')
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim()
    if (firstIp) return firstIp
  }

  const cfConnectingIp = event.request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }

  try {
    return event.getClientAddress()
  } catch {
    return '127.0.0.1'
  }
}

/**
 * Resolves the rate limit identifier using dual tracking (signed cookie + IP + user role).
 */
export function resolveRateLimitIdentifier(event: RequestEvent): RateLimitIdentifier {
  const user = event.locals.user
  const isAdmin = user?.role === 'admin'

  // 1. Signed Guest Cookie
  const rawToken = event.cookies.get(GUEST_COOKIE_NAME)
  let guestId = verifyGuestToken(rawToken)

  if (!guestId) {
    guestId = crypto.randomUUID()
    event.cookies.set(GUEST_COOKIE_NAME, signGuestId(guestId), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365
    })
  }

  // 2. Client IP
  const clientIp = extractClientIp(event)

  return {
    isAdmin,
    userKey: user ? `user:${user.id}` : undefined,
    cookieKey: `guest:c:${guestId}`,
    ipKey: `guest:ip:${clientIp}`
  }
}

const pbHeaders = {
  'x-internal-key': INTERNAL_SECRET_KEY
}

/**
 * Fetches the count for a single key on the given date from PocketBase or memory cache.
 */
async function fetchKeyCount(
  pb: PocketBase | undefined,
  key: string,
  date: string
): Promise<{ count: number; recordId?: string }> {
  if (pb) {
    try {
      const record = await pb.collection('daily_usage').getFirstListItem(
        pb.filter('key = {:key} && date = {:date}', { key, date }),
        { headers: pbHeaders }
      )
      const count = Number(record.count) || 0
      memoryUsage.set(key, { date, count })
      return { count, recordId: record.id }
    } catch (err: unknown) {
      const errWithStatus = err as { status?: number }
      if (errWithStatus?.status === 404) {
        memoryUsage.set(key, { date, count: 0 })
        return { count: 0 }
      }
    }
  }

  const mem = memoryUsage.get(key)
  const count = mem && mem.date === date ? mem.count : 0
  return { count }
}

/**
 * Sets/updates the count for a single key on the given date in PocketBase and memory cache.
 */
async function setKeyCount(
  pb: PocketBase | undefined,
  key: string,
  date: string,
  count: number,
  recordId?: string
): Promise<void> {
  memoryUsage.set(key, { date, count })

  if (!pb) return

  try {
    if (recordId) {
      await pb.collection('daily_usage').update(recordId, { count }, { headers: pbHeaders })
    } else {
      await pb.collection('daily_usage').create({ key, date, count }, { headers: pbHeaders })
    }
  } catch {
    // If create fails (e.g. concurrent race condition), attempt update
    try {
      const existing = await pb.collection('daily_usage').getFirstListItem(
        pb.filter('key = {:key} && date = {:date}', { key, date }),
        { headers: pbHeaders }
      )
      await pb.collection('daily_usage').update(existing.id, { count }, { headers: pbHeaders })
    } catch {
      // In-memory update was already performed
    }
  }
}

/**
 * Returns the current quota status for the user/guest.
 */
export async function getQuota(
  pb: PocketBase | undefined,
  identifier: RateLimitIdentifier
): Promise<QuotaInfo> {
  const resetAt = getResetAtUtc()
  if (identifier.isAdmin) {
    return {
      remaining: Infinity,
      total: DAILY_MESSAGE_LIMIT,
      isUnlimited: true,
      resetAt
    }
  }

  const date = getUtcDateString()

  if (identifier.userKey) {
    // For logged-in users, compare account count and cookie count
    const [userCountData, cookieCountData] = await Promise.all([
      fetchKeyCount(pb, identifier.userKey, date),
      fetchKeyCount(pb, identifier.cookieKey, date)
    ])
    const used = Math.max(userCountData.count, cookieCountData.count)
    return {
      remaining: Math.max(0, DAILY_MESSAGE_LIMIT - used),
      total: DAILY_MESSAGE_LIMIT,
      isUnlimited: false,
      resetAt
    }
  }

  // For guests, use dual tracking (signed cookie and client IP)
  const [cookieCountData, ipCountData] = await Promise.all([
    fetchKeyCount(pb, identifier.cookieKey, date),
    fetchKeyCount(pb, identifier.ipKey, date)
  ])
  const used = Math.max(cookieCountData.count, ipCountData.count)
  return {
    remaining: Math.max(0, DAILY_MESSAGE_LIMIT - used),
    total: DAILY_MESSAGE_LIMIT,
    isUnlimited: false,
    resetAt
  }
}

/**
 * Consumes 1 message from the daily quota.
 */
export async function consumeQuota(
  pb: PocketBase | undefined,
  identifier: RateLimitIdentifier
): Promise<{ allowed: boolean; quota: QuotaInfo }> {
  const resetAt = getResetAtUtc()
  if (identifier.isAdmin) {
    return {
      allowed: true,
      quota: {
        remaining: Infinity,
        total: DAILY_MESSAGE_LIMIT,
        isUnlimited: true,
        resetAt
      }
    }
  }

  const date = getUtcDateString()

  if (identifier.userKey) {
    // Logged in user: sync user key and cookie key
    const [userCountData, cookieCountData] = await Promise.all([
      fetchKeyCount(pb, identifier.userKey, date),
      fetchKeyCount(pb, identifier.cookieKey, date)
    ])
    const currentUsed = Math.max(userCountData.count, cookieCountData.count)

    if (currentUsed >= DAILY_MESSAGE_LIMIT) {
      return {
        allowed: false,
        quota: {
          remaining: 0,
          total: DAILY_MESSAGE_LIMIT,
          isUnlimited: false,
          resetAt
        }
      }
    }

    const nextUsed = currentUsed + 1
    await Promise.all([
      setKeyCount(pb, identifier.userKey, date, nextUsed, userCountData.recordId),
      setKeyCount(pb, identifier.cookieKey, date, nextUsed, cookieCountData.recordId)
    ])

    return {
      allowed: true,
      quota: {
        remaining: Math.max(0, DAILY_MESSAGE_LIMIT - nextUsed),
        total: DAILY_MESSAGE_LIMIT,
        isUnlimited: false,
        resetAt
      }
    }
  }

  // Guest user: sync signed cookie key and IP key
  const [cookieCountData, ipCountData] = await Promise.all([
    fetchKeyCount(pb, identifier.cookieKey, date),
    fetchKeyCount(pb, identifier.ipKey, date)
  ])
  const currentUsed = Math.max(cookieCountData.count, ipCountData.count)

  if (currentUsed >= DAILY_MESSAGE_LIMIT) {
    return {
      allowed: false,
      quota: {
        remaining: 0,
        total: DAILY_MESSAGE_LIMIT,
        isUnlimited: false,
        resetAt
      }
    }
  }

  const nextUsed = currentUsed + 1
  await Promise.all([
    setKeyCount(pb, identifier.cookieKey, date, nextUsed, cookieCountData.recordId),
    setKeyCount(pb, identifier.ipKey, date, nextUsed, ipCountData.recordId)
  ])

  return {
    allowed: true,
    quota: {
      remaining: Math.max(0, DAILY_MESSAGE_LIMIT - nextUsed),
      total: DAILY_MESSAGE_LIMIT,
      isUnlimited: false,
      resetAt
    }
  }
}

/**
 * Consumes 1 title generation from a dedicated daily rate limit.
 */
export async function consumeTitleQuota(
  pb: PocketBase | undefined,
  identifier: RateLimitIdentifier
): Promise<boolean> {
  if (identifier.isAdmin) {
    return true
  }

  const date = getUtcDateString()

  if (identifier.userKey) {
    const titleUserKey = `title:${identifier.userKey}`
    const titleCookieKey = `title:${identifier.cookieKey}`
    const [userCountData, cookieCountData] = await Promise.all([
      fetchKeyCount(pb, titleUserKey, date),
      fetchKeyCount(pb, titleCookieKey, date)
    ])
    const currentUsed = Math.max(userCountData.count, cookieCountData.count)

    if (currentUsed >= DAILY_TITLE_LIMIT) {
      return false
    }

    const nextUsed = currentUsed + 1
    await Promise.all([
      setKeyCount(pb, titleUserKey, date, nextUsed, userCountData.recordId),
      setKeyCount(pb, titleCookieKey, date, nextUsed, cookieCountData.recordId)
    ])
    return true
  }

  const titleCookieKey = `title:${identifier.cookieKey}`
  const titleIpKey = `title:${identifier.ipKey}`
  const [cookieCountData, ipCountData] = await Promise.all([
    fetchKeyCount(pb, titleCookieKey, date),
    fetchKeyCount(pb, titleIpKey, date)
  ])
  const currentUsed = Math.max(cookieCountData.count, ipCountData.count)

  if (currentUsed >= DAILY_TITLE_LIMIT) {
    return false
  }

  const nextUsed = currentUsed + 1
  await Promise.all([
    setKeyCount(pb, titleCookieKey, date, nextUsed, cookieCountData.recordId),
    setKeyCount(pb, titleIpKey, date, nextUsed, ipCountData.recordId)
  ])
  return true
}
