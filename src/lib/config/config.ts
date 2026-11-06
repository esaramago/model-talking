import type { AgentDraft, ChatSettings, LanguageOption } from '@/types/chat'
import { MESSAGE_MAX_CHARS_DEFAULT } from './limits'

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
export const OPENROUTER_IMAGE_API_URL = 'https://openrouter.ai/api/v1/images'

// MODELS
// z-ai/glm-5.3-flash (https://openrouter.ai/z-ai/glm-5.3-flash)
// mistralai/mistral-nemo (https://openrouter.ai/mistralai/mistral-nemo)
export const MODEL = 'z-ai/glm-5.3-flash'
export const AVATAR_MODEL = 'recraft/recraft-v4.1-flash'

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { value: 'pt-PT', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'ru', label: 'Русский' },
  { value: 'ar', label: 'العربية' }
]

export const DEFAULT_SETTINGS: ChatSettings = {
  generalRules: '',
  language: SUPPORTED_LANGUAGES[0].value,
  maxChars: MESSAGE_MAX_CHARS_DEFAULT
}

export const DEFAULT_AGENT_DRAFT: AgentDraft = {
  initialTopic: '',
  agent1Name: '',
  agent2Name: '',
  systemPrompt1: '',
  systemPrompt2: ''
}

