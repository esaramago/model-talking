import type { ChatMessage, LanguageOption, ModelOption } from '@/types/chat'
import { BASE_SYSTEM_PROMPT, DEFAULT_MODEL, DEFAULT_SETTINGS, SUPPORTED_LANGUAGES } from '@/lib/config'

export { BASE_SYSTEM_PROMPT, DEFAULT_MODEL, SUPPORTED_LANGUAGES }

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

  return `Responde sempre em ${language}.`
}

export interface ApiChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Builds standard OpenAI/OpenRouter message payload tailored for the target speaker,
 * ensuring strict alternating roles and leading user message.
 */
export function buildMessagesForModel(
  messages: ChatMessage[],
  targetSpeaker: 'llm1' | 'llm2',
  systemPrompt: string,
  generalRules: string = DEFAULT_SETTINGS.generalRules,
  agentName?: string,
  language?: string
): ApiChatMessage[] {
  const result: ApiChatMessage[] = []

  const namePrompt = agentName?.trim() ? `O teu nome é ${agentName.trim()}.` : ''
  const languagePrompt = getLanguageInstruction(language)
  const rules = generalRules !== undefined ? generalRules.trim() : DEFAULT_SETTINGS.generalRules

  const combinedSystemPrompt = [BASE_SYSTEM_PROMPT, namePrompt, systemPrompt.trim(), languagePrompt, rules]
    .filter(Boolean)
    .join('\n\n')

  if (combinedSystemPrompt) {
    result.push({ role: 'system', content: combinedSystemPrompt })
  }

  if (targetSpeaker === 'llm2') {
    // LLM 2 sees LLM 1 messages as 'user' and its own messages as 'assistant'
    for (const msg of messages) {
      result.push({
        role: msg.speaker === 'llm1' ? 'user' : 'assistant',
        content: msg.content
      })
    }
  } else {
    // LLM 1 sees LLM 2 messages as 'user' and its own as 'assistant'
    // To strictly begin with role 'user', combine initial turn 1 & 2 into opening context
    if (messages.length >= 2) {
      const otherSpeakerName = messages[1].speakerName || 'LLM 2'
      result.push({
        role: 'user',
        content: `Opening context:\nYou started with: "${messages[0].content}"\n${otherSpeakerName} replied: "${messages[1].content}"`
      })

      for (let i = 2; i < messages.length; i++) {
        const msg = messages[i]
        result.push({
          role: msg.speaker === 'llm1' ? 'assistant' : 'user',
          content: msg.content
        })
      }
    } else if (messages.length === 1) {
      result.push({
        role: 'user',
        content: messages[0].content
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
}

export async function requestModelTurn(payload: {
  model: string
  messages: ApiChatMessage[]
  maxTokens: number
  temperature?: number
}): Promise<ChatResponse> {
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
      model: model || DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'És um gerador de títulos concisos para conversas. O título DEVE ter no máximo 30 caracteres.'
        },
        {
          role: 'user',
          content: `Tópico: ${trimmedPrompt}`
        }
      ],
      maxTokens: 25,
      temperature: 0.5
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
