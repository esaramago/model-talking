import crypto from 'node:crypto'
import type PocketBase from 'pocketbase'
import type { RequestEvent } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { DAILY_MESSAGE_LIMIT, DAILY_TITLE_LIMIT } from '@/lib/config'
import { getAdminPocketBase } from '@/lib/server/pbAdmin'

export { DAILY_MESSAGE_LIMIT, DAILY_TITLE_LIMIT }

const GUEST_COOKIE_NAME = 'mt_guest_token'
const RUNTIME_COOKIE_SECRET = crypto.randomBytes(32).toString('hex')

function getCookieSecret(): string {
  return (
    env.RATE_LIMIT_SECRET ||
    env.OPENROUTER_API_KEY ||
    process.env.RATE_LIMIT_SECRET ||
    process.env.OPENROUTER_API_KEY ||
    RUNTIME_COOKIE_SECRET
  )
}

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

interface MemoryUsageEntry {
  date: string
  count: number
  recordId?: string
}

// In-memory fallback and cache to optimize reads and handle offline edge cases
const memoryUsage = new Map<string, MemoryUsageEntry>()

// Key serialization queue to prevent TOCTOU race conditions across parallel requests
const keyQueues = new Map<string, Promise<void>>()

let lastCleanupDate = getUtcDateString()

/**
 * Clears stale in-memory usage entries for dates other than the specified (or current UTC) date.
 */
export function clearStaleMemoryUsage(currentDate: string = getUtcDateString()): number {
  let evicted = 0
  for (const [key, entry] of memoryUsage.entries()) {
    if (entry.date !== currentDate) {
      memoryUsage.delete(key)
      evicted++
    }
  }
  lastCleanupDate = currentDate
  return evicted
}

function ensureFreshMemoryUsage(currentDate: string = getUtcDateString()): void {
  if (currentDate !== lastCleanupDate) {
    clearStaleMemoryUsage(currentDate)
  }
}

// Setup background interval to periodically clear stale memory cache entries
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    clearStaleMemoryUsage()
  }, 1000 * 60 * 60)
  if (typeof timer === 'object' && timer && 'unref' in timer && typeof timer.unref === 'function') {
    timer.unref()
  }
}

/**
 * Serializes task execution for a specific key in memory using a FIFO promise queue.
 */
function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const current = keyQueues.get(key) || Promise.resolve()

  let release!: () => void
  const next = new Promise<void>((resolve) => {
    release = resolve
  })

  keyQueues.set(key, next)

  return current
    .catch(() => {})
    .then(task)
    .finally(() => {
      if (keyQueues.get(key) === next) {
        keyQueues.delete(key)
      }
      release()
    })
}

/**
 * Serializes task execution across multiple keys by acquiring locks in sorted order,
 * completely preventing race conditions (TOCTOU) and avoiding deadlocks.
 */
function withKeysLock<T>(keys: (string | undefined)[], task: () => Promise<T>): Promise<T> {
  const uniqueSortedKeys = [...new Set(keys.filter((k): k is string => Boolean(k)))].sort()
  if (uniqueSortedKeys.length === 0) {
    return task()
  }

  function acquire(index: number): Promise<T> {
    if (index >= uniqueSortedKeys.length) {
      return task()
    }
    return withLock(uniqueSortedKeys[index], () => acquire(index + 1))
  }

  return acquire(0)
}

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
  const hmac = crypto.createHmac('sha256', getCookieSecret()).update(id).digest('hex')
  return `${id}.${hmac}`
}

/**
 * Validates the HMAC signature of a guest token.
 */
function verifyGuestToken(token: string | undefined): string | null {
  if (!token || !token.includes('.')) return null
  const [id, signature] = token.split('.')
  if (!id || !signature) return null

  const expected = crypto.createHmac('sha256', getCookieSecret()).update(id).digest('hex')
  const sigBuffer = Buffer.from(signature)
  const expBuffer = Buffer.from(expected)

  if (sigBuffer.length !== expBuffer.length) return null
  if (crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return id
  }
  return null
}

/**
 * Extracts the real client IP address from the SvelteKit request event.
 * Configure ADDRESS_HEADER / XFF_DEPTH in @sveltejs/adapter-node when behind a reverse proxy.
 */
function extractClientIp(event: RequestEvent): string {
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

async function getEffectivePb(pb?: PocketBase): Promise<PocketBase | undefined> {
  const adminPb = await getAdminPocketBase()
  return adminPb || pb
}

/**
 * Fetches the count for a single key on the given date from PocketBase or memory cache.
 */
async function fetchKeyCount(
  pb: PocketBase | undefined,
  key: string,
  date: string
): Promise<{ count: number; recordId?: string }> {
  ensureFreshMemoryUsage(date)

  const mem = memoryUsage.get(key)
  if (mem && mem.date !== date) {
    memoryUsage.delete(key)
  }

  const client = await getEffectivePb(pb)
  if (client) {
    try {
      const record = await client.collection('daily_usage').getFirstListItem(
        client.filter('key = {:key} && date = {:date}', { key, date })
      )
      const count = Number(record.count) || 0
      const effectiveCount = mem && mem.date === date ? Math.max(count, mem.count) : count
      memoryUsage.set(key, { date, count: effectiveCount, recordId: record.id })
      return { count: effectiveCount, recordId: record.id }
    } catch (err: unknown) {
      const errWithStatus = err as { status?: number }
      if (errWithStatus?.status === 404) {
        const fallbackCount = mem && mem.date === date ? mem.count : 0
        memoryUsage.set(key, { date, count: fallbackCount, recordId: mem?.recordId })
        return { count: fallbackCount, recordId: mem?.recordId }
      }
    }
  }

  const count = mem && mem.date === date ? mem.count : 0
  return { count, recordId: mem?.date === date ? mem.recordId : undefined }
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
  const mem = memoryUsage.get(key)
  const effectiveRecordId = recordId || (mem?.date === date ? mem.recordId : undefined)

  memoryUsage.set(key, { date, count, recordId: effectiveRecordId })

  const client = await getEffectivePb(pb)
  if (!client) return

  try {
    if (effectiveRecordId) {
      await client.collection('daily_usage').update(effectiveRecordId, { count })
    } else {
      const created = await client.collection('daily_usage').create({ key, date, count })
      memoryUsage.set(key, { date, count, recordId: created.id })
    }
  } catch {
    // If create fails (e.g. concurrent race condition or unique constraint hit), attempt update
    try {
      const existing = await client.collection('daily_usage').getFirstListItem(
        client.filter('key = {:key} && date = {:date}', { key, date })
      )
      await client.collection('daily_usage').update(existing.id, { count })
      memoryUsage.set(key, { date, count, recordId: existing.id })
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
  ensureFreshMemoryUsage(date)

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
 * Increments are serialized per key in memory to eliminate TOCTOU race conditions.
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
  ensureFreshMemoryUsage(date)

  const keys = identifier.userKey
    ? [identifier.userKey, identifier.cookieKey]
    : [identifier.cookieKey, identifier.ipKey]

  return withKeysLock(keys, async () => {
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
  })
}

/**
 * Consumes 1 title generation from a dedicated daily rate limit.
 * Increments are serialized per key in memory to eliminate TOCTOU race conditions.
 */
export async function consumeTitleQuota(
  pb: PocketBase | undefined,
  identifier: RateLimitIdentifier
): Promise<boolean> {
  if (identifier.isAdmin) {
    return true
  }

  const date = getUtcDateString()
  ensureFreshMemoryUsage(date)

  if (identifier.userKey) {
    const titleUserKey = `title:${identifier.userKey}`
    const titleCookieKey = `title:${identifier.cookieKey}`
    const keys = [titleUserKey, titleCookieKey]

    return withKeysLock(keys, async () => {
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
    })
  }

  const titleCookieKey = `title:${identifier.cookieKey}`
  const titleIpKey = `title:${identifier.ipKey}`
  const keys = [titleCookieKey, titleIpKey]

  return withKeysLock(keys, async () => {
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
  })
}
