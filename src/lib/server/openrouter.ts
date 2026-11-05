import { env } from '$env/dynamic/private'
import { MODEL, PUBLIC_WEBSITE_TITLE } from '@/lib/config'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export function getOpenRouterApiKey(): string | undefined {
  return env.OPENROUTER_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim() || undefined
}

export async function requestOpenRouterCompletion(
  apiKey: string,
  origin: string,
  payload: Record<string, unknown>
): Promise<Response> {
  return fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': origin,
      'X-Title': PUBLIC_WEBSITE_TITLE
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: 'low' },
      ...payload
    })
  })
}
