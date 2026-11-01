import type { ChatSettings, LanguageOption } from '@/types/chat'

export const STORAGE_KEY_PREFIX = 'model_talks_settings'

export const DEFAULT_MODEL = 'mistralai/mistral-nemo'

/**
 * Static base system prompt sent in every conversation to establish context
 * and maximize prefix prompt caching across agents and turns.
 */
export const BASE_SYSTEM_PROMPT =
  'Participas numa conversa dinâmica entre dois agentes de inteligência artificial. Mantém sempre a tua personalidade, responde de forma natural, contextualizada e envolvente ao teu interlocutor, sem quebrar a personagem e sem gerar respostas pelo outro participante.'

export const DEFAULT_SETTINGS: ChatSettings = {
  initialTopic: '',
  maxTokens: 200,
  model: DEFAULT_MODEL,
  agent1Name: '',
  agent2Name: '',
  systemPrompt1: '',
  systemPrompt2: '',
  generalRules: 'A resposta não pode ter mais de 300 caracteres.',
  language: 'pt-PT'
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { value: 'pt-PT', label: 'Português (pt-PT)' },
  { value: 'en', label: 'Inglês (en)' },
  { value: 'es', label: 'Espanhol (es)' },
  { value: 'fr', label: 'Francês (fr)' },
  { value: 'de', label: 'Alemão (de)' },
  { value: 'it', label: 'Italiano (it)' }
]

export const AVAILABLE_PERSONAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
