import crypto from 'node:crypto'
import type PocketBase from 'pocketbase'
import type { RequestEvent } from '@sveltejs/kit'
import type { DailyQuota } from '@/types/chat'
import {
  DAILY_MESSAGE_LIMIT,
  DAILY_TITLE_LIMIT,
  DAILY_GUEST_IP_LIMIT,
  DAILY_TITLE_IP_LIMIT
} from '@/lib/config/limits'
import { getAdminPocketBase } from '@/lib/server/pbAdmin'
import { deriveServerKey } from '@/lib/server/twoFactor'

const GUEST_COOKIE_NAME = 'mt_guest_token'
const MAX_MEMORY_USAGE_ENTRIES = 10_000

function getCookieSecret(): string {
  return deriveServerKey('rate-limit-cookie')
}

export type QuotaInfo = DailyQuota

export interface RateLimitIdentifier {
  isAdmin: boolean
  userKey?: string
  cookieKey: string
  ipKey?: string
  clientIp?: string
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
 * Determines whether an IP address is a local loopback or private/unknown address.
 */
export function isLoopbackIp(ip: string | undefined | null): boolean {
  if (!ip) return true
  const trimmed = ip.trim().toLowerCase()
  return (
    trimmed === '127.0.0.1' ||
    trimmed === '::1' ||
    trimmed === 'localhost' ||
    trimmed === '::ffff:127.0.0.1' ||
    trimmed.startsWith('127.') ||
    trimmed === 'unknown'
  )
}

/**
 * Determines whether IP-based limits are skipped for an address.
 * Only local development is exempt: in production, loopback or unresolved addresses
 * are never trusted, so a request cannot dodge IP limits by hiding its address.
 */
export function isIpLimitExempt(ip: string | undefined | null): boolean {
  return process.env.NODE_ENV !== 'production' && isLoopbackIp(ip)
}

/**
 * Resolves the client IP address, returning 'unknown' when it cannot be determined
 * (for example, a missing ADDRESS_HEADER behind a reverse proxy).
 */
export function resolveClientIp(getClientAddress: () => string): string {
  try {
    return getClientAddress() || 'unknown'
  } catch {
    return 'unknown'
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
  const clientIp = resolveClientIp(event.getClientAddress)
  const isExempt = isIpLimitExempt(clientIp)

  return {
    isAdmin,
    userKey: user ? `user:${user.id}` : undefined,
    cookieKey: `guest:c:${guestId}`,
    ipKey: isExempt ? undefined : `guest:ip:${clientIp}`,
    clientIp
  }
}

async function getEffectivePb(pb?: PocketBase): Promise<PocketBase | undefined> {
  const adminPb = await getAdminPocketBase()
  return adminPb || pb
}

function setMemoryUsageEntry(key: string, entry: MemoryUsageEntry): void {
  if (memoryUsage.has(key)) {
    memoryUsage.delete(key)
  } else if (memoryUsage.size >= MAX_MEMORY_USAGE_ENTRIES) {
    const oldestKey = memoryUsage.keys().next().value
    if (oldestKey !== undefined) {
      memoryUsage.delete(oldestKey)
    }
  }
  memoryUsage.set(key, entry)
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
      setMemoryUsageEntry(key, { date, count: effectiveCount, recordId: record.id })
      return { count: effectiveCount, recordId: record.id }
    } catch (err: unknown) {
      const errWithStatus = err as { status?: number }
      if (errWithStatus?.status === 404) {
        if (mem && mem.date === date && (mem.count > 0 || mem.recordId)) {
          return { count: mem.count, recordId: mem.recordId }
        }
        return { count: 0, recordId: undefined }
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

  setMemoryUsageEntry(key, { date, count, recordId: effectiveRecordId })

  const client = await getEffectivePb(pb)
  if (!client) return

  try {
    if (effectiveRecordId) {
      await client.collection('daily_usage').update(effectiveRecordId, { count })
    } else {
      const created = await client.collection('daily_usage').create({ key, date, count })
      setMemoryUsageEntry(key, { date, count, recordId: created.id })
    }
  } catch {
    // If create fails (e.g. concurrent race condition or unique constraint hit), attempt update
    try {
      const existing = await client.collection('daily_usage').getFirstListItem(
        client.filter('key = {:key} && date = {:date}', { key, date })
      )
      await client.collection('daily_usage').update(existing.id, { count })
      setMemoryUsageEntry(key, { date, count, recordId: existing.id })
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
    // For logged-in users, compare account count and cookie count (no IP locking)
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

  // For guests, use signed cookie (per-guest) and aggregate IP quota (abuse safeguard)
  const hasIp = Boolean(identifier.ipKey)
  const [cookieCountData, ipCountData] = await Promise.all([
    fetchKeyCount(pb, identifier.cookieKey, date),
    hasIp ? fetchKeyCount(pb, identifier.ipKey!, date) : Promise.resolve({ count: 0 })
  ])

  const cookieRemaining = Math.max(0, DAILY_MESSAGE_LIMIT - cookieCountData.count)
  const ipBlocked = hasIp && ipCountData.count >= DAILY_GUEST_IP_LIMIT
  const remaining = ipBlocked ? 0 : cookieRemaining

  return {
    remaining,
    total: DAILY_MESSAGE_LIMIT,
    isUnlimited: false,
    resetAt
  }
}

async function consumeScopedQuota(
  pb: PocketBase | undefined,
  identifier: RateLimitIdentifier,
  options: {
    prefix?: string
    dailyLimit: number
    ipLimit: number
  }
): Promise<{ allowed: boolean; quota: QuotaInfo }> {
  const { prefix = '', dailyLimit, ipLimit } = options
  const resetAt = getResetAtUtc()

  if (identifier.isAdmin) {
    return {
      allowed: true,
      quota: {
        remaining: Infinity,
        total: dailyLimit,
        isUnlimited: true,
        resetAt
      }
    }
  }

  const date = getUtcDateString()
  ensureFreshMemoryUsage(date)

  const prefixKey = (k: string) => (prefix ? `${prefix}:${k}` : k)
  const cookieKey = prefixKey(identifier.cookieKey)

  if (identifier.userKey) {
    const userKey = prefixKey(identifier.userKey)
    const keys = [userKey, cookieKey]

    return withKeysLock(keys, async () => {
      const [userCountData, cookieCountData] = await Promise.all([
        fetchKeyCount(pb, userKey, date),
        fetchKeyCount(pb, cookieKey, date)
      ])
      const currentUsed = Math.max(userCountData.count, cookieCountData.count)

      if (currentUsed >= dailyLimit) {
        return {
          allowed: false,
          quota: {
            remaining: 0,
            total: dailyLimit,
            isUnlimited: false,
            resetAt
          }
        }
      }

      const nextUsed = currentUsed + 1
      await Promise.all([
        setKeyCount(pb, userKey, date, nextUsed, userCountData.recordId),
        setKeyCount(pb, cookieKey, date, nextUsed, cookieCountData.recordId)
      ])

      return {
        allowed: true,
        quota: {
          remaining: Math.max(0, dailyLimit - nextUsed),
          total: dailyLimit,
          isUnlimited: false,
          resetAt
        }
      }
    })
  }

  // Guest user: check per-device signed cookie and aggregate IP limit
  const ipKey = identifier.ipKey ? prefixKey(identifier.ipKey) : undefined
  const keys = ipKey ? [cookieKey, ipKey] : [cookieKey]

  return withKeysLock(keys, async () => {
    const [cookieCountData, ipCountData] = await Promise.all([
      fetchKeyCount(pb, cookieKey, date),
      ipKey
        ? fetchKeyCount(pb, ipKey, date)
        : Promise.resolve<{ count: number; recordId?: string }>({ count: 0 })
    ])

    if (cookieCountData.count >= dailyLimit || (ipKey && ipCountData.count >= ipLimit)) {
      return {
        allowed: false,
        quota: {
          remaining: 0,
          total: dailyLimit,
          isUnlimited: false,
          resetAt
        }
      }
    }

    const nextCookieUsed = cookieCountData.count + 1
    const nextIpUsed = ipCountData.count + 1

    const updates: Promise<void>[] = [
      setKeyCount(pb, cookieKey, date, nextCookieUsed, cookieCountData.recordId)
    ]
    if (ipKey) {
      updates.push(setKeyCount(pb, ipKey, date, nextIpUsed, ipCountData.recordId))
    }
    await Promise.all(updates)

    return {
      allowed: true,
      quota: {
        remaining: Math.max(0, dailyLimit - nextCookieUsed),
        total: dailyLimit,
        isUnlimited: false,
        resetAt
      }
    }
  })
}

/**
 * Consumes 1 message from the daily quota.
 * Increments are serialized per key in memory to eliminate TOCTOU race conditions.
 */
export async function consumeQuota(
  pb: PocketBase | undefined,
  identifier: RateLimitIdentifier
): Promise<{ allowed: boolean; quota: QuotaInfo }> {
  return consumeScopedQuota(pb, identifier, {
    dailyLimit: DAILY_MESSAGE_LIMIT,
    ipLimit: DAILY_GUEST_IP_LIMIT
  })
}

/**
 * Gives back 1 message credit taken by consumeQuota, used when the AI provider fails.
 */
export async function refundQuota(
  pb: PocketBase | undefined,
  identifier: RateLimitIdentifier
): Promise<void> {
  if (identifier.isAdmin) return

  const date = getUtcDateString()
  ensureFreshMemoryUsage(date)

  const keys = (
    identifier.userKey
      ? [identifier.userKey, identifier.cookieKey]
      : [identifier.cookieKey, identifier.ipKey]
  ).filter((key): key is string => Boolean(key))

  await withKeysLock(keys, () =>
    Promise.all(
      keys.map(async (key) => {
        const { count, recordId } = await fetchKeyCount(pb, key, date)
        if (count > 0) {
          await setKeyCount(pb, key, date, count - 1, recordId)
        }
      })
    )
  )
}

/**
 * Consumes 1 title generation from a dedicated daily rate limit.
 * Increments are serialized per key in memory to eliminate TOCTOU race conditions.
 */
export async function consumeTitleQuota(
  pb: PocketBase | undefined,
  identifier: RateLimitIdentifier
): Promise<boolean> {
  const result = await consumeScopedQuota(pb, identifier, {
    prefix: 'title',
    dailyLimit: DAILY_TITLE_LIMIT,
    ipLimit: DAILY_TITLE_IP_LIMIT
  })
  return result.allowed
}
