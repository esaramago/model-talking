import PocketBase from 'pocketbase'
import { env } from '$env/dynamic/private'

const POCKETBASE_URL =
  env.POCKETBASE_URL ||
  env.VITE_POCKETBASE_URL ||
  process.env.POCKETBASE_URL ||
  process.env.VITE_POCKETBASE_URL ||
  'http://127.0.0.1:8095'

const ADMIN_EMAIL =
  env.POCKETBASE_ADMIN_EMAIL ||
  env.PB_ADMIN_EMAIL ||
  process.env.POCKETBASE_ADMIN_EMAIL ||
  process.env.PB_ADMIN_EMAIL

const ADMIN_PASSWORD =
  env.POCKETBASE_ADMIN_PASSWORD ||
  env.PB_ADMIN_PASSWORD ||
  process.env.POCKETBASE_ADMIN_PASSWORD ||
  process.env.PB_ADMIN_PASSWORD

let adminPbInstance: PocketBase | null = null

/**
 * Returns an authenticated PocketBase superuser/admin client.
 * Returns null if superuser credentials are not configured or authentication fails.
 */
export async function getAdminPocketBase(): Promise<PocketBase | null> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return null
  }

  if (adminPbInstance && adminPbInstance.authStore.isValid) {
    return adminPbInstance
  }

  const pb = new PocketBase(POCKETBASE_URL)

  try {
    // PocketBase 0.23+ uses _superusers collection, with fallback to admins
    if (typeof pb.collection('_superusers')?.authWithPassword === 'function') {
      try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
      } catch {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
      }
    } else {
      await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
    }

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
