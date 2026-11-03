import { json, type RequestHandler } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { MAX_INPUT_TOKENS, MAX_OUTPUT_TOKENS } from '@/lib/config'
import { consumeQuota, getQuota, resolveRateLimitIdentifier } from '@/lib/server/rateLimit'

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
  isTitle?: boolean
}

export const GET: RequestHandler = async (event) => {
  const identifier = resolveRateLimitIdentifier(event)
  const quota = await getQuota(event.locals.pb, identifier)
  return json(quota)
}

export const POST: RequestHandler = async (event) => {
  const { request, locals } = event
  try {
    const body = (await request.json()) as ChatRequestBody
    const { model, messages, maxTokens = MAX_OUTPUT_TOKENS, temperature = 0.7, isTitle = false } = body

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

    const identifier = resolveRateLimitIdentifier(event)

    let currentQuota
    if (isTitle) {
      currentQuota = await getQuota(locals.pb, identifier)
      if (!identifier.isAdmin && currentQuota.remaining <= 0) {
        return json(
          {
            error: 'Daily message limit reached (20/20). Your messages will reset at 00:00 UTC.',
            quota: currentQuota
          },
          { status: 429 }
        )
      }
    } else {
      const quotaResult = await consumeQuota(locals.pb, identifier)
      currentQuota = quotaResult.quota
      if (!quotaResult.allowed) {
        return json(
          {
            error: 'Daily message limit reached (20/20). Your messages will reset at 00:00 UTC.',
            quota: currentQuota
          },
          { status: 429 }
        )
      }
    }

    const totalEstimatedChars = messages.reduce((acc, m) => {
      if (typeof m.content === 'string') return acc + m.content.length
      if (Array.isArray(m.content)) {
        return acc + m.content.reduce((sum, p) => sum + (p.text?.length || 0), 0)
      }
      return acc
    }, 0)

    if (totalEstimatedChars > MAX_INPUT_TOKENS * 4) {
      return json(
        { error: `Input exceeds the maximum allowed token limit (${MAX_INPUT_TOKENS}).` },
        { status: 400 }
      )
    }

    const clampedTokens = Math.max(10, Math.min(Number(maxTokens) || MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS))

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

      return json({ error: errMessage, quota: currentQuota }, { status: response.status })
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
      model: data.model || model,
      quota: currentQuota
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return json({ error: message }, { status: 500 })
  }
}
