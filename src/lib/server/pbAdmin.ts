import PocketBase from 'pocketbase'
import { env } from '$env/dynamic/private'

const POCKETBASE_URL =
  env.INTERNAL_POCKETBASE_URL ||
  process.env.INTERNAL_POCKETBASE_URL ||
  'http://127.0.0.1:8095'

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
let warnedMissingAdmin = false

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

  const pb = new PocketBase(POCKETBASE_URL)

  try {
    // PocketBase 0.23+ uses the _superusers auth collection
    await pb.collection('_superusers').authWithPassword(email, password)

    adminPbInstance = pb
    return adminPbInstance
  } catch (err) {
    console.warn('[pbAdmin] Superuser authentication failed:', err)
    return null
  }
}

/**
 * Returns the authenticated PocketBase superuser client when available,
 * falling back to the request's user-scoped PocketBase instance.
 */
export async function getPrivilegedPocketBase(fallbackPb: PocketBase): Promise<PocketBase> {
  const adminPb = await getAdminPocketBase()
  return adminPb || fallbackPb
}
