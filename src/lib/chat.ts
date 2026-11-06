import type { ChatMessage, DailyQuota } from '@/types/chat'
import {
  AGENT_1_BASE_PROMPT,
  AGENT_2_BASE_PROMPT,
  BASE_SYSTEM_PROMPT,
  MODEL,
  DEFAULT_SETTINGS,
  MAX_INPUT_TOKENS
} from '@/lib/config'

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
    return 'Responde siempre en español.'
  }

  if (normalized === 'fr') {
    return 'Réponds toujours en français.'
  }

  if (normalized === 'de') {
    return 'Antworte immer auf Deutsch.'
  }

  if (normalized === 'it') {
    return 'Rispondi sempre in italiano.'
  }

  if (normalized === 'tr') {
    return 'Her zaman Türkçe yanıt ver.'
  }

  if (normalized === 'ru') {
    return 'Всегда отвечай на русском языке.'
  }

  if (normalized === 'ar') {
    return 'أجب دائمًا باللغة العربية.'
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

  const anchorCount = targetSpeaker === 'agent1' ? 2 : 1
  const anchors = messages.slice(0, anchorCount)
  let currentTokens = anchors.reduce((acc, m) => acc + estimateTextTokens(m.content), 0)
  let startIndex = messages.length

  for (let i = messages.length - 1; i >= anchorCount; i--) {
    const msgTokens = estimateTextTokens(messages[i].content)
    if (currentTokens + msgTokens > availableBudget) break
    currentTokens += msgTokens
    startIndex = i
  }

  if (startIndex % 2 !== anchorCount % 2 && startIndex < messages.length) {
    startIndex++
  }

  return startIndex >= messages.length ? anchors : [...anchors, ...messages.slice(startIndex)]
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
  const rules = generalRules.trim()
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
    // Agent 2 sees Agent 1 messages as 'user' and its own messages as 'assistant'
    for (const msg of budgetedMessages) {
      result.push({
        role: msg.speaker === 'agent1' ? 'user' : 'assistant',
        content: msg.content
      })
    }
  } else {
    // Agent 1 sees Agent 2 messages as 'user' and its own as 'assistant'
    // To strictly begin with role 'user', combine initial turn 1 & 2 into opening context
    if (budgetedMessages.length >= 2) {
      const otherSpeakerName = budgetedMessages[1].speakerName || 'Agent 2'
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
  isName?: boolean
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

export async function generateAgentName(
  description: string,
  fallbackName: string,
  language?: string,
  model?: string
): Promise<string> {
  const trimmedDescription = description.trim()
  if (!trimmedDescription) return fallbackName

  try {
    const res = await requestModelTurn({
      model: model || MODEL,
      messages: [
        {
          role: 'user',
          content: trimmedDescription
        }
      ],
      language,
      maxTokens: 40,
      temperature: 0.5,
      isName: true
    })

    let name = res.content.trim()
    name = name.replace(/^(nome|name|character|personagem)\s*:\s*/i, '')
    name = name.replace(/^["'`«»\s]+|["'`«»\s]+$/g, '')
    name = name.split('\n')[0].trim()

    if (name.length > 35) {
      name = name.slice(0, 35).trim()
    }

    return name || fallbackName
  } catch (err) {
    console.warn('Failed to generate agent name via AI, falling back:', err)
    return fallbackName
  }
}

export interface RandomScenarioResult {
  systemPrompt1: string
  systemPrompt2: string
  initialTopic: string
  quota?: DailyQuota
}

export async function generateRandomScenario(
  language?: string,
  theme?: import('@/lib/config').ScenarioTheme
): Promise<RandomScenarioResult> {
  const res = await fetch('/api/random', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ language, theme })
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || `HTTP error ${res.status}`) as Error & { quota?: DailyQuota }
    if (data.quota) {
      error.quota = data.quota
    }
    throw error
  }

  return data as RandomScenarioResult
}
