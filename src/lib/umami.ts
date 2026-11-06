import { dev } from '$app/environment'
import { page } from '$app/state'

export type UmamiEventData = Record<string, string | number | boolean>

/**
 * Checks whether the currently logged in user is an administrator.
 */
function isCurrentUserAdmin(): boolean {
  try {
    return page.data?.user?.role === 'admin'
  } catch {
    return false
  }
}

/**
 * Tracks a custom event in Umami Analytics if available.
 * If the current user is an admin, the event name is prefixed with "Admin: "
 * and `isAdmin: true` is included in the event payload.
 *
 * @param eventName Name of the event to track
 * @param eventData Optional key-value metadata for the event
 */
export function trackUmamiEvent(
  eventName: string,
  eventData?: UmamiEventData
): void {
  if (!dev && typeof window !== 'undefined' && typeof window.umami?.track === 'function') {
    try {
      const isAdmin = isCurrentUserAdmin()
      const finalEventName = isAdmin ? `Admin: ${eventName}` : eventName
      const finalEventData: UmamiEventData = {
        ...(eventData ?? {}),
        ...(isAdmin ? { isAdmin: true } : {})
      }

      window.umami.track(finalEventName, finalEventData)
    } catch (err) {
      console.warn('Failed to track Umami event:', err)
    }
  }
}
