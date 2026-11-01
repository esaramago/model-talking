import type { ChatSettings } from '@/types/chat'
import { pb } from '@/lib/pocketbase'
import { DEFAULT_SETTINGS, STORAGE_KEY_PREFIX } from '@/lib/config'
import { i18n } from '@/lib/i18n/index.svelte'

export { DEFAULT_SETTINGS, STORAGE_KEY_PREFIX }

export function getStorageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY_PREFIX}_${userId}` : `${STORAGE_KEY_PREFIX}_guest`
}

export function sanitizeSettings(
  settings: Partial<ChatSettings & { model1?: string; model2?: string }>
): ChatSettings {
  return {
    initialTopic:
      typeof settings.initialTopic === 'string'
        ? settings.initialTopic.slice(0, 200)
        : DEFAULT_SETTINGS.initialTopic,
    maxTokens:
      typeof settings.maxTokens === 'number' && !Number.isNaN(settings.maxTokens)
        ? settings.maxTokens
        : DEFAULT_SETTINGS.maxTokens,
    model:
      typeof settings.model === 'string' && settings.model.trim()
        ? settings.model
        : typeof settings.model1 === 'string' && settings.model1.trim()
          ? settings.model1
          : DEFAULT_SETTINGS.model,
    agent1Name:
      typeof settings.agent1Name === 'string' && settings.agent1Name.trim()
        ? settings.agent1Name
        : DEFAULT_SETTINGS.agent1Name,
    agent2Name:
      typeof settings.agent2Name === 'string' && settings.agent2Name.trim()
        ? settings.agent2Name
        : DEFAULT_SETTINGS.agent2Name,
    systemPrompt1:
      typeof settings.systemPrompt1 === 'string'
        ? settings.systemPrompt1.slice(0, 200)
        : DEFAULT_SETTINGS.systemPrompt1,
    systemPrompt2:
      typeof settings.systemPrompt2 === 'string'
        ? settings.systemPrompt2.slice(0, 200)
        : DEFAULT_SETTINGS.systemPrompt2,
    generalRules:
      typeof settings.generalRules === 'string'
        ? settings.generalRules.slice(0, 100)
        : DEFAULT_SETTINGS.generalRules,
    language:
      typeof settings.language === 'string' && settings.language.trim()
        ? settings.language.trim()
        : DEFAULT_SETTINGS.language
  }
}

let guestSettings: ChatSettings = { ...DEFAULT_SETTINGS }
const userSettingsCache = new Map<string, ChatSettings>()

// Clean up any legacy localStorage entries once on client
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith(STORAGE_KEY_PREFIX) || k === 'pocketbase_auth')) {
        keysToRemove.push(k)
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k)
    }
  } catch {
    // Fail silently
  }
}

export function loadSettings(
  userId?: string | null,
  fallbackSettings?: Partial<ChatSettings> | null
): ChatSettings {
  if (userId) {
    const cached = userSettingsCache.get(userId)
    if (cached) {
      return cached
    }
  }

  if (fallbackSettings && typeof fallbackSettings === 'object' && Object.keys(fallbackSettings).length > 0) {
    const sanitized = sanitizeSettings(fallbackSettings)
    if (userId) {
      userSettingsCache.set(userId, sanitized)
      return sanitized
    }
    return {
      ...sanitized,
      model: DEFAULT_SETTINGS.model,
      maxTokens: DEFAULT_SETTINGS.maxTokens,
      generalRules: DEFAULT_SETTINGS.generalRules
    }
  }

  if (!userId) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const storedLang = localStorage.getItem('model_talks_lang')
        if (storedLang) {
          guestSettings.language = storedLang
        }
      } catch {
        // Fail silently
      }
    }
    return {
      ...guestSettings,
      model: DEFAULT_SETTINGS.model,
      maxTokens: DEFAULT_SETTINGS.maxTokens,
      generalRules: DEFAULT_SETTINGS.generalRules
    }
  }

  return DEFAULT_SETTINGS
}

export function saveSettings(settings: ChatSettings, userId?: string | null): void {
  const sanitized = sanitizeSettings(settings)

  if (userId) {
    userSettingsCache.set(userId, sanitized)
  } else {
    guestSettings = {
      ...sanitized,
      model: DEFAULT_SETTINGS.model,
      maxTokens: DEFAULT_SETTINGS.maxTokens,
      generalRules: DEFAULT_SETTINGS.generalRules
    }
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('model_talks_lang', sanitized.language)
      } catch {
        // Fail silently
      }
    }
  }

  i18n.setLanguage(sanitized.language)

  const activeUserId = userId || (typeof window !== 'undefined' ? pb.authStore.record?.id : null)
  if (activeUserId && typeof window !== 'undefined' && pb.authStore.record?.id === activeUserId) {
    pb.collection('users')
      .update(activeUserId, {
        settings: sanitized
      })
      .then((updatedUser) => {
        if (pb.authStore.isValid && pb.authStore.token) {
          pb.authStore.save(pb.authStore.token, updatedUser)
        }
      })
      .catch(() => {
        // Fail silently
      })
  }
}

export function clearSettings(userId?: string | null): void {
  if (userId) {
    userSettingsCache.delete(userId)
  } else {
    guestSettings = { ...DEFAULT_SETTINGS }
  }
}
