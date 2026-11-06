import { env } from '$env/dynamic/private'
import {
  AVATAR_MODEL,
  MODEL,
  OPENROUTER_API_URL,
  OPENROUTER_IMAGE_API_URL,
  PUBLIC_WEBSITE_TITLE
} from '@/lib/config'

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

export async function requestOpenRouterImage(
  apiKey: string,
  origin: string,
  prompt: string
): Promise<Response> {
  return fetch(OPENROUTER_IMAGE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': origin,
      'X-Title': PUBLIC_WEBSITE_TITLE
    },
    body: JSON.stringify({
      model: AVATAR_MODEL,
      prompt: `Character avatar portrait: ${prompt}. Centered, minimalist illustration icon, clean design.`,
      aspect_ratio: '1:1',
      n: 1
    })
  })
}
