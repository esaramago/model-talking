export type UmamiEventData = Record<string, string | number | boolean>

/**
 * Tracks a custom event in Umami Analytics if available.
 *
 * @param eventName Name of the event to track
 * @param eventData Optional key-value metadata for the event
 */
export function trackUmamiEvent(
  eventName: string,
  eventData?: UmamiEventData
): void {
  if (typeof window !== 'undefined' && typeof window.umami?.track === 'function') {
    try {
      window.umami.track(eventName, eventData)
    } catch (err) {
      console.warn('Failed to track Umami event:', err)
    }
  }
}
