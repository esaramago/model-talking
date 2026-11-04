import type { ChatMessage, DailyQuota, LanguageOption, ModelOption } from '@/types/chat'
import {
  AGENT_1_BASE_PROMPT,
  AGENT_2_BASE_PROMPT,
  BASE_SYSTEM_PROMPT,
  MODEL,
  DEFAULT_SETTINGS,
  MAX_INPUT_TOKENS,
  SUPPORTED_LANGUAGES
} from '@/lib/config'

export {
  AGENT_1_BASE_PROMPT,
  AGENT_2_BASE_PROMPT,
  BASE_SYSTEM_PROMPT,
  MODEL,
  MAX_INPUT_TOKENS,
  SUPPORTED_LANGUAGES
}

export function getLanguageInstruction(language?: string): string {
  if (!language) return ''
  const normalized = language.trim().toLowerCase()

  if (
    normalized === 'en' ||
    normalized === 'en-us' ||
    normalized === 'en-gb' ||
    normalized === 'english' ||
    normalized === 'inglês'
  ) {
    return ''
  }

  if (normalized === 'pt-pt' || normalized === 'pt') {
    return 'Responde sempre em português de Portugal (pt-PT).'
  }

  if (normalized === 'es') {
    return 'Responde sempre em espanhol.'
  }

  if (normalized === 'fr') {
    return 'Responde sempre em francês.'
  }

  if (normalized === 'de') {
    return 'Responde sempre em alemão.'
  }

  if (normalized === 'it') {
    return 'Responde sempre em italiano.'
  }

  if (normalized === 'tr') {
    return 'Responde sempre em turco.'
  }

  if (normalized === 'ru') {
    return 'Responde sempre em russo.'
  }

  if (normalized === 'ar') {
    return 'Responde sempre em árabe.'
  }

  return `Responde sempre em ${language}.`
}

export interface MessageContentPart {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

export interface ApiChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | MessageContentPart[]
}

export function estimateTextTokens(text: string): number {
  return Math.ceil((text?.length || 0) / 3.5)
}

/**
 * Ensures conversation messages fit within the token budget while preserving
 * topic grounding and strict alternating user/assistant role integrity.
 */
export function budgetMessages(
  messages: ChatMessage[],
  targetSpeaker: 'agent1' | 'agent2',
  availableBudget: number
): ChatMessage[] {
  if (messages.length <= 2) return messages

  const totalTokens = messages.reduce((acc, m) => acc + estimateTextTokens(m.content), 0)
  if (totalTokens <= availableBudget) return messages

  if (targetSpeaker === 'agent1') {
    const baseTokens = estimateTextTokens(messages[0].content) + estimateTextTokens(messages[1].content)
    let currentTokens = baseTokens
    let startIndex = messages.length

    for (let i = messages.length - 1; i >= 2; i--) {
      const msgTokens = estimateTextTokens(messages[i].content)
      if (currentTokens + msgTokens > availableBudget) break
      currentTokens += msgTokens
      startIndex = i
    }

    if (startIndex % 2 !== 0 && startIndex < messages.length) {
      startIndex++
    }

    if (startIndex >= messages.length) {
      return [messages[0], messages[1]]
    }

    return [messages[0], messages[1], ...messages.slice(startIndex)]
  } else {
    const baseTokens = estimateTextTokens(messages[0].content)
    let currentTokens = baseTokens
    let startIndex = messages.length

    for (let i = messages.length - 1; i >= 1; i--) {
      const msgTokens = estimateTextTokens(messages[i].content)
      if (currentTokens + msgTokens > availableBudget) break
      currentTokens += msgTokens
      startIndex = i
    }

    if (startIndex % 2 === 0 && startIndex < messages.length) {
      startIndex++
    }

    if (startIndex >= messages.length) {
      return [messages[0]]
    }

    return [messages[0], ...messages.slice(startIndex)]
  }
}

/**
 * Builds standard OpenAI/OpenRouter message payload tailored for the target speaker,
 * ensuring strict alternating roles and leading user message.
 */
export function buildMessagesForModel(
  messages: ChatMessage[],
  targetSpeaker: 'agent1' | 'agent2',
  systemPrompt: string,
  generalRules: string = DEFAULT_SETTINGS.generalRules,
  agentName?: string,
  language?: string,
  maxChars: number = DEFAULT_SETTINGS.maxChars
): ApiChatMessage[] {
  const result: ApiChatMessage[] = []

  const agentRolePrompt = targetSpeaker === 'agent1' ? AGENT_1_BASE_PROMPT : AGENT_2_BASE_PROMPT
  const namePrompt = agentName?.trim() ? `O teu nome é ${agentName.trim()}.` : ''
  const languagePrompt = getLanguageInstruction(language)
  const rules = generalRules !== undefined ? generalRules.trim() : DEFAULT_SETTINGS.generalRules
  const lengthPrompt = `Strict Character Ceiling: Every response must remain concise and under ${maxChars} characters.`

  const combinedSystemPrompt = [
    BASE_SYSTEM_PROMPT,
    agentRolePrompt,
    namePrompt,
    systemPrompt.trim(),
    languagePrompt,
    rules,
    lengthPrompt
  ]
    .filter(Boolean)
    .join('\n\n')

  if (combinedSystemPrompt) {
    result.push({
      role: 'system',
      content: [
        {
          type: 'text',
          text: combinedSystemPrompt,
          cache_control: { type: 'ephemeral' }
        }
      ]
    })
  }

  const systemTokens = estimateTextTokens(combinedSystemPrompt)
  const availableBudget = Math.max(500, MAX_INPUT_TOKENS - systemTokens)
  const budgetedMessages = budgetMessages(messages, targetSpeaker, availableBudget)

  if (targetSpeaker === 'agent2') {
    // LLM 2 sees LLM 1 messages as 'user' and its own messages as 'assistant'
    for (const msg of budgetedMessages) {
      result.push({
        role: msg.speaker === 'agent1' ? 'user' : 'assistant',
        content: msg.content
      })
    }
  } else {
    // LLM 1 sees LLM 2 messages as 'user' and its own as 'assistant'
    // To strictly begin with role 'user', combine initial turn 1 & 2 into opening context
    if (budgetedMessages.length >= 2) {
      const otherSpeakerName = budgetedMessages[1].speakerName || 'LLM 2'
      result.push({
        role: 'user',
        content: `Opening context:\nYou started with: "${budgetedMessages[0].content}"\n${otherSpeakerName} replied: "${budgetedMessages[1].content}"`
      })

      for (let i = 2; i < budgetedMessages.length; i++) {
        const msg = budgetedMessages[i]
        result.push({
          role: msg.speaker === 'agent1' ? 'assistant' : 'user',
          content: msg.content
        })
      }
    } else if (budgetedMessages.length === 1) {
      result.push({
        role: 'user',
        content: budgetedMessages[0].content
      })
    }
  }

  return result
}

export interface ChatResponse {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model?: string
  quota?: DailyQuota
}

export interface ChatTurnPayload {
  model?: string
  messages: ChatMessage[] | ApiChatMessage[]
  targetSpeaker?: 'agent1' | 'agent2'
  systemPrompt?: string
  generalRules?: string
  agentName?: string
  language?: string
  maxChars?: number
  maxTokens?: number
  temperature?: number
  isTitle?: boolean
  reasoning?: {
    effort?: 'low' | 'medium' | 'high' | 'max' | 'none'
    max_tokens?: number
    exclude?: boolean
  }
}

export async function requestModelTurn(payload: ChatTurnPayload): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`)
  }

  return data as ChatResponse
}

export async function generateTalkTitle(promptText: string, model?: string): Promise<string> {
  const trimmedPrompt = promptText.trim()
  const fallbackTitle =
    trimmedPrompt.length > 30 ? trimmedPrompt.slice(0, 30).trim() : trimmedPrompt || 'Nova conversa'

  try {
    const res = await requestModelTurn({
      model: model || MODEL,
      messages: [
        {
          role: 'user',
          content: `Tópico: ${trimmedPrompt}`
        }
      ],
      maxTokens: 50,
      temperature: 0.5,
      isTitle: true
    })

    let title = res.content.trim()
    title = title.replace(/^["'`«»\s]+|["'`«»\s]+$/g, '')
    title = title.split('\n')[0].trim()

    if (title.length > 30) {
      title = title.slice(0, 30).trim()
    }

    return title || fallbackTitle
  } catch (err) {
    console.warn('Failed to generate talk title via AI, falling back:', err)
    return fallbackTitle
  }
}
