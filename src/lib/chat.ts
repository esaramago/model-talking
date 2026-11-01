import type { ChatMessage, LanguageOption, ModelOption } from '@/types/chat'

export const DEFAULT_MODELS: ModelOption[] = [
  { label: 'Nemotron 3.5 (free)', value: 'nvidia/nemotron-3.5-lightning:free', isFree: true },
  { label: 'XingChen (free)', value: 'xingchen-agi/xing4.0-29b-a4b:free', isFree: true },
  { label: 'Gemma 4', value: 'google/gemma-4-26b-a4b-it', isFree: false },
  { label: 'Mistra Nemo', value: 'mistralai/mistral-nemo', isFree: false },
]

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { value: 'pt-PT', label: 'Português (pt-PT)' },
  { value: 'en', label: 'Inglês (en)' },
  { value: 'es', label: 'Espanhol (es)' },
  { value: 'fr', label: 'Francês (fr)' },
  { value: 'de', label: 'Alemão (de)' },
  { value: 'it', label: 'Italiano (it)' }
]

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
  generalRules?: string,
  agentName?: string,
  language?: string
): ApiChatMessage[] {
  const result: ApiChatMessage[] = []

  const namePrompt = agentName?.trim() ? `O teu nome é ${agentName.trim()}.` : ''
  const languagePrompt = getLanguageInstruction(language)

  const combinedSystemPrompt = [namePrompt, systemPrompt.trim(), languagePrompt, generalRules?.trim()]
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
      model: model || DEFAULT_MODELS[0].value,
      messages: [
        {
          role: 'system',
          content:
            'És um gerador de títulos concisos para conversas. Cria um título descritivo e curto baseado no tópico fornecido. O título DEVE ter no máximo 30 caracteres. Responde APENAS com o título, sem aspas, sem pontuação final e sem texto adicional.'
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
