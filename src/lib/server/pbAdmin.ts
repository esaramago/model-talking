import PocketBase from 'pocketbase'
import { env } from '$env/dynamic/private'
import { createServerPocketBase, POCKETBASE_URL } from '@/lib/server/pocketbase'

function cleanEnv(val?: string): string | undefined {
  if (!val) return undefined
  const trimmed = val.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function getAdminEmail(): string | undefined {
  return cleanEnv(
    env.POCKETBASE_ADMIN_EMAIL ||
    env.PB_ADMIN_EMAIL ||
    process.env.POCKETBASE_ADMIN_EMAIL ||
    process.env.PB_ADMIN_EMAIL
  )
}

function getAdminPassword(): string | undefined {
  return cleanEnv(
    env.POCKETBASE_ADMIN_PASSWORD ||
    env.PB_ADMIN_PASSWORD ||
    process.env.POCKETBASE_ADMIN_PASSWORD ||
    process.env.PB_ADMIN_PASSWORD
  )
}

let adminPbInstance: PocketBase | null = null
let adminAuthPromise: Promise<PocketBase | null> | null = null
let warnedMissingAdmin = false
let lastAuthFailureTime = 0
let failureCooldownMs = 15000

/**
 * Returns an authenticated PocketBase superuser/admin client.
 * Returns null if superuser credentials are not configured or authentication fails.
 */
export async function getAdminPocketBase(): Promise<PocketBase | null> {
  const email = getAdminEmail()
  const password = getAdminPassword()

  if (!email || !password) {
    if (!warnedMissingAdmin) {
      warnedMissingAdmin = true
      console.warn(
        '[pbAdmin] POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD not set. Privileged 2FA fields and persistent rate limits require superuser credentials.'
      )
    }
    return null
  }

  if (adminPbInstance && adminPbInstance.authStore.isValid) {
    return adminPbInstance
  }

  if (adminAuthPromise) {
    return adminAuthPromise
  }

  // Prevent spamming auth requests after a failure (especially when rate limited)
  if (Date.now() - lastAuthFailureTime < failureCooldownMs) {
    return null
  }

  adminAuthPromise = (async () => {
    try {
      const pb = createServerPocketBase(POCKETBASE_URL)

      // PocketBase 0.23+ uses the _superusers auth collection
      await pb.collection('_superusers').authWithPassword(email, password)

      adminPbInstance = pb
      lastAuthFailureTime = 0
      failureCooldownMs = 15000
      return adminPbInstance
    } catch (err: any) {
      const status = err?.status || err?.response?.status
      // If rate limited (429), back off for 60 seconds to allow the rate limit window to expire
      failureCooldownMs = status === 429 ? 60000 : 15000
      lastAuthFailureTime = Date.now()
      console.warn(`[pbAdmin] Superuser authentication failed (${status || 'network error'}):`, err?.message || err)
      return null
    } finally {
      adminAuthPromise = null
    }
  })()

  return adminAuthPromise
}

/**
 * Returns the authenticated PocketBase superuser client when available,
 * falling back to the request's user-scoped PocketBase instance.
 */
export async function getPrivilegedPocketBase(fallbackPb: PocketBase): Promise<PocketBase> {
  const adminPb = await getAdminPocketBase()
  return adminPb || fallbackPb
}
