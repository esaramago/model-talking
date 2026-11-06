import type { ChatMessage } from '@/types/chat'

/**
 * Resizes a base64 or data-URL avatar down to thumbnail dimensions (e.g. 96x96)
 * to keep talk message JSON lightweight and well within PocketBase storage limits.
 */
export async function resizeAvatar(
  dataUrl?: string | null,
  maxDimension = 96,
  quality = 0.8
): Promise<string> {
  if (!dataUrl || typeof window === 'undefined') return dataUrl || ''

  // Only downscale raster data URLs
  if (
    !dataUrl.startsWith('data:image/') ||
    dataUrl.startsWith('data:image/svg+xml')
  ) {
    return dataUrl
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width
        let height = img.naturalHeight || img.height

        if (width <= maxDimension && height <= maxDimension && dataUrl.length < 20_000) {
          resolve(dataUrl)
          return
        }

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const resized = canvas.toDataURL('image/webp', quality)
        resolve(resized && resized.length < dataUrl.length ? resized : dataUrl)
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/**
 * Sanitizes messages before saving to PocketBase:
 * 1. Ensures avatars are only retained on the first message of each speaker to prevent duplication.
 * 2. Drops any avatar that exceeds safe storage thresholds (> 50KB).
 */
export function sanitizeMessagesForStorage(messages: ChatMessage[]): ChatMessage[] {
  let seenAgent1 = false
  let seenAgent2 = false

  return messages.map((m) => {
    let keepAvatar = false
    if (m.speaker === 'agent1' && !seenAgent1 && m.avatar) {
      seenAgent1 = true
      keepAvatar = true
    } else if (m.speaker === 'agent2' && !seenAgent2 && m.avatar) {
      seenAgent2 = true
      keepAvatar = true
    }

    if (keepAvatar) {
      if (m.avatar && m.avatar.length > 50_000) {
        const { avatar, ...rest } = m
        return rest as ChatMessage
      }
      return m
    }

    if (m.avatar) {
      const { avatar, ...rest } = m
      return rest as ChatMessage
    }

    return m
  })
}
