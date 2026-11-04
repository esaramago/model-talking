import type { ChatSettings, LanguageOption } from '@/types/chat'
import { MESSAGE_MAX_CHARS_DEFAULT } from './limits'

// MODELS
// z-ai/glm-5.3-flash (https://openrouter.ai/z-ai/glm-5.3-flash)
// mistralai/mistral-nemo (https://openrouter.ai/mistralai/mistral-nemo)
export const MODEL = 'z-ai/glm-5.3-flash'

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
  initialTopic: '',
  agent1Name: '',
  agent2Name: '',
  systemPrompt1: '',
  systemPrompt2: '',
  generalRules: '',
  language: SUPPORTED_LANGUAGES[0].value,
  maxChars: MESSAGE_MAX_CHARS_DEFAULT
}

export const AVAILABLE_PERSONAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
