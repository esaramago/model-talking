import { json, type RequestHandler } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import {
  DAILY_MESSAGE_LIMIT,
  DEFAULT_SETTINGS,
  GENERAL_RULES_MAX_CHARS,
  MAX_INPUT_TOKENS,
  MESSAGE_MAX_CHARS_DEFAULT,
  MESSAGE_MAX_CHARS_MAX,
  MESSAGE_MAX_CHARS_MIN,
  MODEL
} from '@/lib/config'
import {
  consumeQuota,
  consumeTitleQuota,
  getQuota,
  refundQuota,
  resolveRateLimitIdentifier,
  type QuotaInfo,
  type RateLimitIdentifier
} from '@/lib/server/rateLimit'
import { buildMessagesForModel, type ApiChatMessage } from '@/lib/chat'
import type { ChatMessage } from '@/types/chat'

const TITLE_SYSTEM_PROMPT =
  'És um gerador de títulos concisos para conversas. O título DEVE ter no máximo 30 caracteres.'
const TITLE_MAX_OUTPUT_TOKENS = 50
const TITLE_MAX_INPUT_CHARS = 500

interface ChatRequestBody {
  model?: string
  messages: Array<Record<string, unknown>>
  targetSpeaker?: 'agent1' | 'agent2'
  systemPrompt?: string
  generalRules?: string
  agentName?: string
  language?: string
  maxChars?: number
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
  let currentQuota: QuotaInfo | undefined
  let creditIdentifier: RateLimitIdentifier | null = null

  async function refundCredit() {
    if (!creditIdentifier) return
    const identifier = creditIdentifier
    creditIdentifier = null
    await refundQuota(locals.pb, identifier)
    if (currentQuota && !currentQuota.isUnlimited) {
      currentQuota = {
        ...currentQuota,
        remaining: Math.min(currentQuota.total, currentQuota.remaining + 1)
      }
    }
  }

  try {
    const body = (await request.json()) as ChatRequestBody
    const {
      messages,
      targetSpeaker,
      systemPrompt,
      generalRules,
      agentName,
      language,
      maxChars,
      maxTokens,
      temperature = 0.7,
      isTitle = false
    } = body

    const resolvedApiKey = env.OPENROUTER_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim()

    if (!resolvedApiKey) {
      return json(
        {
          error: 'OpenRouter API key is missing. Set OPENROUTER_API_KEY in your .env file.'
        },
        { status: 400 }
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Conversation messages are required.' }, { status: 400 })
    }

    const identifier = resolveRateLimitIdentifier(event)

    let effectiveMessages: ApiChatMessage[]
    let clampedTokens: number
    let effectiveTemperature: number

    if (isTitle) {
      currentQuota = await getQuota(locals.pb, identifier)
      if (!identifier.isAdmin && currentQuota.remaining <= 0) {
        return json(
          {
            error: `Daily credit limit reached (${DAILY_MESSAGE_LIMIT}/${DAILY_MESSAGE_LIMIT}). Your credits will reset at 00:00 UTC.`,
            quota: currentQuota
          },
          { status: 429 }
        )
      }

      const titleAllowed = await consumeTitleQuota(locals.pb, identifier)
      if (!titleAllowed) {
        return json(
          {
            error: 'Daily title generation limit reached. Your limit will reset at 00:00 UTC.',
            quota: currentQuota
          },
          { status: 429 }
        )
      }

      const lastUserMessage = [...messages].reverse().find((m) => m && (m.role === 'user' || m.speaker))
      const rawUserContent =
        typeof lastUserMessage?.content === 'string'
          ? lastUserMessage.content.trim()
          : Array.isArray(lastUserMessage?.content)
            ? lastUserMessage.content.map((p: any) => p?.text || '').join('').trim()
            : ''

      if (!rawUserContent) {
        return json({ error: 'Title prompt is required.' }, { status: 400 })
      }

      const truncatedUserContent = rawUserContent.slice(0, TITLE_MAX_INPUT_CHARS)

      effectiveMessages = [
        { role: 'system', content: TITLE_SYSTEM_PROMPT },
        { role: 'user', content: truncatedUserContent }
      ]
      clampedTokens = TITLE_MAX_OUTPUT_TOKENS
      effectiveTemperature = 0.5
    } else {
      // Reject any client-injected system or developer role messages
      const hasUnauthorizedRole = messages.some(
        (m) =>
          m &&
          typeof m === 'object' &&
          'role' in m &&
          (m.role === 'system' || m.role === 'developer')
      )
      if (hasUnauthorizedRole) {
        return json(
          { error: 'System roles are not permitted. Persona prompts are constructed on the server.' },
          { status: 400 }
        )
      }

      if (targetSpeaker !== 'agent1' && targetSpeaker !== 'agent2') {
        return json(
          { error: 'Invalid or missing targetSpeaker. Must be "agent1" or "agent2".' },
          { status: 400 }
        )
      }

      const clampedMaxChars = Math.min(
        MESSAGE_MAX_CHARS_MAX,
        Math.max(
          MESSAGE_MAX_CHARS_MIN,
          Math.round(Number(maxChars) || MESSAGE_MAX_CHARS_DEFAULT)
        )
      )

      const safeSystemPrompt =
        typeof systemPrompt === 'string' ? systemPrompt.trim().slice(0, 2000) : ''
      const safeGeneralRules =
        typeof generalRules === 'string'
          ? generalRules.trim().slice(0, GENERAL_RULES_MAX_CHARS)
          : DEFAULT_SETTINGS.generalRules
      const safeAgentName =
        typeof agentName === 'string' ? agentName.trim().slice(0, 50) : undefined
      const safeLanguage =
        typeof language === 'string' ? language.trim().slice(0, 20) : undefined

      const otherSpeaker = targetSpeaker === 'agent1' ? 'agent2' : 'agent1'
      const chatMessages: ChatMessage[] = []

      for (let i = 0; i < messages.length; i++) {
        const m = messages[i]
        if (!m || typeof m !== 'object') continue

        let content = ''
        if (typeof m.content === 'string') {
          content = m.content
        } else if (Array.isArray(m.content)) {
          content = m.content.map((p: any) => p?.text || '').join('')
        }

        let speaker: 'agent1' | 'agent2'
        if (m.speaker === 'agent1' || m.speaker === 'agent2') {
          speaker = m.speaker
        } else if (m.role === 'assistant') {
          speaker = targetSpeaker
        } else {
          speaker = otherSpeaker
        }

        chatMessages.push({
          id: typeof m.id === 'string' ? m.id : `msg-${i}`,
          speaker,
          speakerName:
            typeof m.speakerName === 'string'
              ? m.speakerName.slice(0, 50)
              : speaker === 'agent1'
                ? 'Agent 1'
                : 'Agent 2',
          model: MODEL,
          content: content.slice(0, 4000),
          turn: typeof m.turn === 'number' ? m.turn : i + 1,
          timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now()
        })
      }

      if (chatMessages.length === 0) {
        return json({ error: 'Valid conversation messages are required.' }, { status: 400 })
      }

      // Build authoritative system prompt and alternating context on the server
      effectiveMessages = buildMessagesForModel(
        chatMessages,
        targetSpeaker,
        safeSystemPrompt,
        safeGeneralRules,
        safeAgentName,
        safeLanguage,
        clampedMaxChars
      )

      const totalEstimatedChars = effectiveMessages.reduce((acc, m) => {
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

      // Strictly enforce output token limits derived from maxChars (including low-effort reasoning headroom)
      const tokenCeilingFromChars = Math.min(800, Math.ceil(clampedMaxChars * 1.5) + 200)
      clampedTokens = Math.min(
        tokenCeilingFromChars,
        Math.max(20, Number(maxTokens) || tokenCeilingFromChars)
      )
      effectiveTemperature = Math.max(0, Math.min(Number(temperature) || 0.7, 2))
    }

    if (!isTitle) {
      const quotaResult = await consumeQuota(locals.pb, identifier)
      currentQuota = quotaResult.quota
      if (!quotaResult.allowed) {
        return json(
          {
            error: `Daily credit limit reached (${DAILY_MESSAGE_LIMIT}/${DAILY_MESSAGE_LIMIT}). Your credits will reset at 00:00 UTC.`,
            quota: currentQuota
          },
          { status: 429 }
        )
      }
      creditIdentifier = identifier
    }

    const requestPayload: Record<string, unknown> = {
      model: MODEL,
      messages: effectiveMessages,
      max_tokens: clampedTokens,
      temperature: effectiveTemperature,
      reasoning: { effort: 'low' }
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': event.url.origin,
        'X-Title': 'Model Talking'
      },
      body: JSON.stringify(requestPayload)
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenRouter error:', response.status, errText)
      await refundCredit()
      const error =
        response.status === 429
          ? 'AI provider rate limit reached. Please try again later.'
          : 'Failed to generate response from AI provider.'
      return json({ error, quota: currentQuota }, { status: response.status === 429 ? 429 : 502 })
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
      model: data.model || MODEL,
      quota: currentQuota
    })
  } catch (err: unknown) {
    console.error('Chat API error:', err)
    await refundCredit()
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}
