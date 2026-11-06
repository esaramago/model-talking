import { json, type RequestHandler } from '@sveltejs/kit'
import { getOpenRouterApiKey, requestOpenRouterImage } from '@/lib/server/openrouter'
import {
  consumeAvatarQuota,
  getQuota,
  resolveRateLimitIdentifier
} from '@/lib/server/rateLimit'

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg'])
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

interface AvatarRequestBody {
  prompt1?: string
  prompt2?: string
}

export const POST: RequestHandler = async (event) => {
  const { request, url, locals } = event
  const apiKey = getOpenRouterApiKey()

  if (!apiKey) {
    return json(
      { error: 'OpenRouter API key is missing. Set OPENROUTER_API_KEY in your .env file.' },
      { status: 400 }
    )
  }

  try {
    const body = (await request.json()) as AvatarRequestBody
    const { prompt1, prompt2 } = body

    const safePrompt1 = typeof prompt1 === 'string' ? prompt1.trim().slice(0, 500) : ''
    const safePrompt2 = typeof prompt2 === 'string' ? prompt2.trim().slice(0, 500) : ''

    if (!safePrompt1 && !safePrompt2) {
      return json({ error: 'At least one prompt is required.' }, { status: 400 })
    }

    const identifier = resolveRateLimitIdentifier(event)
    const currentQuota = await getQuota(locals.pb, identifier)
    if (!identifier.isAdmin && currentQuota.remaining <= 0) {
      return json({ error: 'Daily credit limit reached.', quota: currentQuota }, { status: 429 })
    }

    const avatarAllowed = await consumeAvatarQuota(locals.pb, identifier)
    if (!avatarAllowed) {
      return json({ error: 'Daily avatar generation limit reached.' }, { status: 429 })
    }

    const origin = url.origin

    const generateSingleAvatar = async (prompt?: string): Promise<string | null> => {
      if (!prompt) return null
      try {
        const response = await requestOpenRouterImage(apiKey, origin, prompt)
        if (!response.ok) {
          const errText = await response.text()
          console.error('OpenRouter avatar generation failed:', response.status, errText)
          return null
        }
        const data = await response.json()
        const item = data?.data?.[0]
        if (!item) return null

        if (item.b64_json) {
          const mediaType = ALLOWED_IMAGE_MIME_TYPES.has(item.media_type)
            ? item.media_type
            : 'image/webp'
          return `data:${mediaType};base64,${item.b64_json}`
        }
        if (typeof item.url === 'string') {
          const parsedUrl = new URL(item.url)
          if (parsedUrl.protocol !== 'https:') return null

          const imgResponse = await fetch(parsedUrl.toString())
          if (!imgResponse.ok) return null

          const rawType = imgResponse.headers.get('content-type')?.split(';')[0]?.trim() || ''
          const mediaType = ALLOWED_IMAGE_MIME_TYPES.has(rawType) ? rawType : 'image/webp'
          const arrayBuffer = await imgResponse.arrayBuffer()
          if (arrayBuffer.byteLength > MAX_AVATAR_BYTES) return null

          const base64 = Buffer.from(arrayBuffer).toString('base64')
          return `data:${mediaType};base64,${base64}`
        }
        return null
      } catch (err) {
        console.error('Failed to generate avatar image:', err)
        return null
      }
    }

    const [avatar1, avatar2] = await Promise.all([
      generateSingleAvatar(safePrompt1),
      generateSingleAvatar(safePrompt2)
    ])

    return json({ avatar1, avatar2 })
  } catch (err) {
    console.error('Unexpected error in /api/avatar:', err)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}
