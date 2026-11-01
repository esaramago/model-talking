import type { ChatSettings } from '@/types/chat'
import { pb } from '@/lib/pocketbase'
import { DEFAULT_SETTINGS, STORAGE_KEY_PREFIX } from '@/lib/config'
import { i18n } from '@/lib/i18n/index.svelte'

export { DEFAULT_SETTINGS, STORAGE_KEY_PREFIX }

export const DRAFT_STORAGE_KEY = 'model_talks_draft'

export interface AgentDraft {
  initialTopic: string
  agent1Name: string
  agent2Name: string
  systemPrompt1: string
  systemPrompt2: string
}

export function getStorageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY_PREFIX}_${userId}` : `${STORAGE_KEY_PREFIX}_guest`
}

function getDraftStorageKey(userId?: string | null): string {
  return userId ? `${DRAFT_STORAGE_KEY}_${userId}` : `${DRAFT_STORAGE_KEY}_guest`
}

export function sanitizeSettings(
  settings: Partial<ChatSettings>
): ChatSettings {
  return {
    initialTopic:
      typeof settings.initialTopic === 'string'
        ? settings.initialTopic.slice(0, 200)
        : DEFAULT_SETTINGS.initialTopic,
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

/**
 * Loads the unsaved agents draft from localStorage, if any.
 * The draft is cleared once the conversation is persisted to the database.
 */
export function loadAgentDraft(userId?: string | null): AgentDraft | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null
  }

  try {
    const raw = localStorage.getItem(getDraftStorageKey(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    return {
      initialTopic:
        typeof parsed.initialTopic === 'string'
          ? parsed.initialTopic.slice(0, 200)
          : '',
      agent1Name:
        typeof parsed.agent1Name === 'string' ? parsed.agent1Name.slice(0, 40) : '',
      agent2Name:
        typeof parsed.agent2Name === 'string' ? parsed.agent2Name.slice(0, 40) : '',
      systemPrompt1:
        typeof parsed.systemPrompt1 === 'string'
          ? parsed.systemPrompt1.slice(0, 200)
          : '',
      systemPrompt2:
        typeof parsed.systemPrompt2 === 'string'
          ? parsed.systemPrompt2.slice(0, 200)
          : ''
    }
  } catch {
    return null
  }
}

export function saveAgentDraft(
  draft: AgentDraft,
  userId?: string | null
): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return
  }

  try {
    const key = getDraftStorageKey(userId)
    const serialized = JSON.stringify({
      initialTopic: draft.initialTopic.slice(0, 200),
      agent1Name: draft.agent1Name.slice(0, 40),
      agent2Name: draft.agent2Name.slice(0, 40),
      systemPrompt1: draft.systemPrompt1.slice(0, 200),
      systemPrompt2: draft.systemPrompt2.slice(0, 200)
    })

    if (localStorage.getItem(key) !== serialized) {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // Fail silently
  }
}

export function clearAgentDraft(userId?: string | null): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(getDraftStorageKey(userId))
  } catch {
    // Fail silently
  }
}
