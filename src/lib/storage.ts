import type { ChatSettings } from '@/types/chat'
import { pb } from '@/lib/pocketbase'
import { DEFAULT_SETTINGS, STORAGE_KEY_PREFIX, GENERAL_RULES_MAX_CHARS } from '@/lib/config'
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
        ? settings.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
        : DEFAULT_SETTINGS.generalRules,
    language:
      typeof settings.language === 'string' && settings.language.trim()
        ? settings.language.trim()
        : DEFAULT_SETTINGS.language
  }
}

let guestSettings: ChatSettings = { ...DEFAULT_SETTINGS }
const userSettingsCache = new Map<string, ChatSettings>()

function loadLocalSettings(userId?: string | null): Partial<ChatSettings> | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function saveLocalSettings(
  settings: Partial<ChatSettings>,
  userId?: string | null
): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return
  }
  try {
    const key = getStorageKey(userId)
    localStorage.setItem(key, JSON.stringify(settings))
  } catch {
    // Fail silently
  }
}

export function loadSettings(
  userId?: string | null,
  userFallback?: { language?: string; generalRules?: string; settings?: Record<string, any>; [key: string]: any } | null
): ChatSettings {
  // 1. Language & General Rules (stored in PocketBase for authenticated users)
  let language = DEFAULT_SETTINGS.language
  let generalRules = DEFAULT_SETTINGS.generalRules

  if (userId) {
    if (userFallback && typeof userFallback === 'object') {
      if (typeof userFallback.language === 'string' && userFallback.language.trim()) {
        language = userFallback.language.trim()
      } else if (userFallback.settings && typeof userFallback.settings.language === 'string' && userFallback.settings.language.trim()) {
        language = userFallback.settings.language.trim()
      }

      if (typeof userFallback.generalRules === 'string') {
        generalRules = userFallback.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
      } else if (userFallback.settings && typeof userFallback.settings.generalRules === 'string') {
        generalRules = userFallback.settings.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
      }
    } else if (typeof window !== 'undefined' && pb.authStore.record?.id === userId) {
      const rec = pb.authStore.record
      if (typeof rec.language === 'string' && rec.language.trim()) {
        language = rec.language.trim()
      }
      if (typeof rec.generalRules === 'string') {
        generalRules = rec.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
      }
    }
  } else {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const storedLang = localStorage.getItem('model_talks_lang')
        if (storedLang) {
          language = storedLang
        }
      } catch {
        // Fail silently
      }
    }
  }

  // 2. The rest (stored in localStorage)
  const local = loadLocalSettings(userId)

  let initialTopic = DEFAULT_SETTINGS.initialTopic
  let agent1Name = DEFAULT_SETTINGS.agent1Name
  let agent2Name = DEFAULT_SETTINGS.agent2Name
  let systemPrompt1 = DEFAULT_SETTINGS.systemPrompt1
  let systemPrompt2 = DEFAULT_SETTINGS.systemPrompt2

  if (local) {
    if (typeof local.initialTopic === 'string') initialTopic = local.initialTopic.slice(0, 200)
    if (typeof local.agent1Name === 'string' && local.agent1Name.trim()) agent1Name = local.agent1Name
    if (typeof local.agent2Name === 'string' && local.agent2Name.trim()) agent2Name = local.agent2Name
    if (typeof local.systemPrompt1 === 'string') systemPrompt1 = local.systemPrompt1.slice(0, 200)
    if (typeof local.systemPrompt2 === 'string') systemPrompt2 = local.systemPrompt2.slice(0, 200)
    if (!userId && typeof local.language === 'string' && local.language.trim() && !language) {
      language = local.language.trim()
    }
  } else if (userFallback && typeof userFallback === 'object') {
    // Migrate any legacy agent settings from PocketBase into localStorage once
    const legacyMigrated: Partial<ChatSettings> = {}
    const legacy = userFallback.settings || userFallback

    if (typeof legacy.initialTopic === 'string' && legacy.initialTopic) {
      initialTopic = legacy.initialTopic.slice(0, 200)
      legacyMigrated.initialTopic = initialTopic
    }
    if (typeof legacy.agent1Name === 'string' && legacy.agent1Name.trim()) {
      agent1Name = legacy.agent1Name.trim()
      legacyMigrated.agent1Name = agent1Name
    }
    if (typeof legacy.agent2Name === 'string' && legacy.agent2Name.trim()) {
      agent2Name = legacy.agent2Name.trim()
      legacyMigrated.agent2Name = agent2Name
    }
    if (typeof legacy.systemPrompt1 === 'string' && legacy.systemPrompt1) {
      systemPrompt1 = legacy.systemPrompt1.slice(0, 200)
      legacyMigrated.systemPrompt1 = systemPrompt1
    }
    if (typeof legacy.systemPrompt2 === 'string' && legacy.systemPrompt2) {
      systemPrompt2 = legacy.systemPrompt2.slice(0, 200)
      legacyMigrated.systemPrompt2 = systemPrompt2
    }
    if (Object.keys(legacyMigrated).length > 0) {
      saveLocalSettings(legacyMigrated, userId)
    }
  }

  const result: ChatSettings = sanitizeSettings({
    initialTopic,
    agent1Name,
    agent2Name,
    systemPrompt1,
    systemPrompt2,
    generalRules,
    language
  })

  if (userId) {
    userSettingsCache.set(userId, result)
  } else {
    guestSettings = result
  }

  return result
}

export function saveSettings(settings: ChatSettings, userId?: string | null): void {
  const sanitized = sanitizeSettings(settings)

  // 1. Save the rest in localStorage
  saveLocalSettings(
    {
      initialTopic: sanitized.initialTopic,
      agent1Name: sanitized.agent1Name,
      agent2Name: sanitized.agent2Name,
      systemPrompt1: sanitized.systemPrompt1,
      systemPrompt2: sanitized.systemPrompt2
    },
    userId
  )

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

  // 2. Save language and generalRules directly to user fields in PocketBase
  const activeUserId = userId || (typeof window !== 'undefined' ? pb.authStore.record?.id : null)
  if (activeUserId && typeof window !== 'undefined' && pb.authStore.record?.id === activeUserId) {
    const currentLang = pb.authStore.record?.language
    const currentRules = pb.authStore.record?.generalRules

    const hasChanged = currentLang !== sanitized.language || currentRules !== sanitized.generalRules

    if (hasChanged) {
      pb.collection('users')
        .update(activeUserId, {
          language: sanitized.language,
          generalRules: sanitized.generalRules
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
}

export function clearSettings(userId?: string | null): void {
  if (userId) {
    userSettingsCache.delete(userId)
  } else {
    guestSettings = { ...DEFAULT_SETTINGS }
  }
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(getStorageKey(userId))
    } catch {
      // Fail silently
    }
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
