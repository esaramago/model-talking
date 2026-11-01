import { json, type RequestHandler } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'

interface ChatMessagePart {
  type: string
  text?: string
  cache_control?: { type: 'ephemeral' }
}

interface ChatRequestBody {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string | ChatMessagePart[]
  }>
  maxTokens?: number
  temperature?: number
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = (await request.json()) as ChatRequestBody
    const { model, messages, maxTokens = 150, temperature = 0.7 } = body

    const resolvedApiKey = env.OPENROUTER_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim()

    if (!resolvedApiKey) {
      return json(
        {
          error: 'OpenRouter API key is missing. Set OPENROUTER_API_KEY in your .env file.'
        },
        { status: 400 }
      )
    }

    if (!model) {
      return json({ error: 'Model identifier is required.' }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Conversation messages are required.' }, { status: 400 })
    }

    const clampedTokens = Math.max(10, Math.min(Number(maxTokens) || 150, 1000))

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5174',
        'X-Title': 'Model Talking'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: clampedTokens,
        temperature: Number(temperature) || 0.7
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      let errMessage = `OpenRouter error (${response.status})`
      try {
        const parsed = JSON.parse(errText)
        errMessage = parsed.error?.message || parsed.message || errText
      } catch {
        errMessage = errText || errMessage
      }

      return json({ error: errMessage }, { status: response.status })
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    const content = choice?.message?.content ?? ''
    const usage = data.usage ?? {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }

    return json({
      content,
      usage,
      model: data.model || model
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return json({ error: message }, { status: 500 })
  }
}
