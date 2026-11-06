import { json, type RequestHandler } from '@sveltejs/kit'
import { getOpenRouterApiKey, requestOpenRouterImage } from '@/lib/server/openrouter'

interface AvatarRequestBody {
  prompt1?: string
  prompt2?: string
}

export const POST: RequestHandler = async (event) => {
  const { request, url } = event
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

    if (!prompt1?.trim() && !prompt2?.trim()) {
      return json({ error: 'At least one prompt is required.' }, { status: 400 })
    }

    const origin = url.origin

    const generateSingleAvatar = async (prompt?: string): Promise<string | null> => {
      if (!prompt?.trim()) return null
      try {
        const response = await requestOpenRouterImage(apiKey, origin, prompt.trim())
        if (!response.ok) {
          const errText = await response.text()
          console.error('OpenRouter avatar generation failed:', response.status, errText)
          return null
        }
        const data = await response.json()
        const item = data?.data?.[0]
        if (!item) return null

        if (item.b64_json) {
          const mediaType = item.media_type || 'image/webp'
          return `data:${mediaType};base64,${item.b64_json}`
        }
        if (item.url) {
          return item.url
        }
        return null
      } catch (err) {
        console.error('Failed to generate avatar image:', err)
        return null
      }
    }

    const [avatar1, avatar2] = await Promise.all([
      generateSingleAvatar(prompt1),
      generateSingleAvatar(prompt2)
    ])

    return json({ avatar1, avatar2 })
  } catch (err) {
    console.error('Unexpected error in /api/avatar:', err)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}
