import type { ChatSettings, AgentDraft } from '@/types/chat'
import { pb } from '@/lib/pocketbase'
import {
  DEFAULT_SETTINGS,
  DEFAULT_AGENT_DRAFT,
  STORAGE_KEY_PREFIX,
  GENERAL_RULES_MAX_CHARS,
  MESSAGE_MAX_CHARS_MIN,
  MESSAGE_MAX_CHARS_MAX
} from '@/lib/config'
import { i18n } from '@/lib/i18n/index.svelte'

export const DRAFT_STORAGE_KEY = 'model_talks_draft'

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
    generalRules:
      typeof settings.generalRules === 'string'
        ? settings.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
        : DEFAULT_SETTINGS.generalRules,
    language:
      typeof settings.language === 'string' && settings.language.trim()
        ? settings.language.trim()
        : DEFAULT_SETTINGS.language,
    maxChars:
      typeof settings.maxChars === 'number' && !isNaN(settings.maxChars)
        ? Math.min(Math.max(Math.round(settings.maxChars), MESSAGE_MAX_CHARS_MIN), MESSAGE_MAX_CHARS_MAX)
        : (typeof (settings as any)?.maxChars === 'string' && !isNaN(Number((settings as any).maxChars))
            ? Math.min(Math.max(Math.round(Number((settings as any).maxChars)), MESSAGE_MAX_CHARS_MIN), MESSAGE_MAX_CHARS_MAX)
            : DEFAULT_SETTINGS.maxChars)
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
  userFallback?: { language?: string; generalRules?: string; maxChars?: number; settings?: Record<string, any>; [key: string]: any } | null
): ChatSettings {
  const effectiveUserId = userId || (typeof window !== 'undefined' ? pb.authStore.record?.id : null)
  const effectiveFallback = userFallback || (typeof window !== 'undefined' ? pb.authStore.record : null)

  // 1. Language, General Rules, Max Chars (stored in PocketBase for authenticated users)
  let language = DEFAULT_SETTINGS.language
  let generalRules = DEFAULT_SETTINGS.generalRules
  let maxChars = DEFAULT_SETTINGS.maxChars

  if (effectiveUserId) {
    const cached = userSettingsCache.get(effectiveUserId)
    if (cached) {
      language = cached.language
      generalRules = cached.generalRules
      maxChars = cached.maxChars
    }

    if (typeof window !== 'undefined' && pb.authStore.record?.id === effectiveUserId) {
      const rec = pb.authStore.record
      if (typeof rec.language === 'string' && rec.language.trim()) {
        language = rec.language.trim()
      }
      if (typeof rec.generalRules === 'string') {
        generalRules = rec.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
      }
      if (typeof rec.maxChars === 'number' && rec.maxChars >= MESSAGE_MAX_CHARS_MIN && rec.maxChars <= MESSAGE_MAX_CHARS_MAX) {
        maxChars = rec.maxChars
      }
    } else if (!cached && effectiveFallback && typeof effectiveFallback === 'object') {
      if (typeof effectiveFallback.language === 'string' && effectiveFallback.language.trim()) {
        language = effectiveFallback.language.trim()
      } else if (effectiveFallback.settings && typeof effectiveFallback.settings.language === 'string' && effectiveFallback.settings.language.trim()) {
        language = effectiveFallback.settings.language.trim()
      }

      if (typeof effectiveFallback.generalRules === 'string') {
        generalRules = effectiveFallback.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
      } else if (effectiveFallback.settings && typeof effectiveFallback.settings.generalRules === 'string') {
        generalRules = effectiveFallback.settings.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
      }

      if (typeof effectiveFallback.maxChars === 'number' && effectiveFallback.maxChars >= MESSAGE_MAX_CHARS_MIN && effectiveFallback.maxChars <= MESSAGE_MAX_CHARS_MAX) {
        maxChars = effectiveFallback.maxChars
      } else if (effectiveFallback.settings && typeof effectiveFallback.settings.maxChars === 'number' && effectiveFallback.settings.maxChars >= MESSAGE_MAX_CHARS_MIN && effectiveFallback.settings.maxChars <= MESSAGE_MAX_CHARS_MAX) {
        maxChars = effectiveFallback.settings.maxChars
      }
    }
  } else {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const storedLang = localStorage.getItem('model_talks_lang')
        if (storedLang) {
          language = storedLang
        }
        const storedMaxChars = localStorage.getItem('model_talks_max_chars')
        if (storedMaxChars) {
          const num = Number(storedMaxChars)
          if (!isNaN(num) && num >= MESSAGE_MAX_CHARS_MIN && num <= MESSAGE_MAX_CHARS_MAX) {
            maxChars = num
          }
        }
        const storedRules = localStorage.getItem('model_talks_general_rules')
        if (typeof storedRules === 'string') {
          generalRules = storedRules.slice(0, GENERAL_RULES_MAX_CHARS)
        }
      } catch {
        // Fail silently
      }
    } else if (guestSettings) {
      language = guestSettings.language
      generalRules = guestSettings.generalRules
      maxChars = guestSettings.maxChars
    }
  }

  // 2. Check localStorage for local cached settings
  const local = loadLocalSettings(effectiveUserId)

  if (local) {
    if (typeof local.generalRules === 'string' && (!generalRules || generalRules === DEFAULT_SETTINGS.generalRules)) {
      generalRules = local.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
    }
    if (typeof local.language === 'string' && local.language.trim() && (!language || language === DEFAULT_SETTINGS.language)) {
      language = local.language.trim()
    }
    if (typeof local.maxChars === 'number' && local.maxChars >= MESSAGE_MAX_CHARS_MIN && local.maxChars <= MESSAGE_MAX_CHARS_MAX && maxChars === DEFAULT_SETTINGS.maxChars) {
      maxChars = local.maxChars
    }
  }

  const result: ChatSettings = sanitizeSettings({
    generalRules,
    language,
    maxChars
  })

  if (effectiveUserId) {
    userSettingsCache.set(effectiveUserId, result)
  } else {
    guestSettings = result
  }

  return result
}

export function saveSettings(settings: ChatSettings, userId?: string | null): void {
  const sanitized = sanitizeSettings(settings)

  // 1. Save all settings in localStorage
  saveLocalSettings(
    {
      generalRules: sanitized.generalRules,
      language: sanitized.language,
      maxChars: sanitized.maxChars
    },
    userId
  )

  if (userId) {
    userSettingsCache.set(userId, sanitized)
  } else {
    guestSettings = sanitized
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('model_talks_lang', sanitized.language)
        localStorage.setItem('model_talks_max_chars', String(sanitized.maxChars))
        localStorage.setItem('model_talks_general_rules', sanitized.generalRules)
      } catch {
        // Fail silently
      }
    }
  }

  i18n.setLanguage(sanitized.language)

  // 2. Save language, generalRules, and maxChars directly to user fields in PocketBase
  const activeUserId = userId || (typeof window !== 'undefined' ? pb.authStore.record?.id : null)
  if (activeUserId && typeof window !== 'undefined' && pb.authStore.record?.id === activeUserId) {
    const currentLang = pb.authStore.record?.language
    const currentRules = pb.authStore.record?.generalRules
    const currentMaxChars = pb.authStore.record?.maxChars

    const hasChanged =
      currentLang !== sanitized.language ||
      currentRules !== sanitized.generalRules ||
      currentMaxChars !== sanitized.maxChars

    if (hasChanged) {
      pb.collection('users')
        .update(activeUserId, {
          language: sanitized.language,
          generalRules: sanitized.generalRules,
          maxChars: sanitized.maxChars
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
          : DEFAULT_AGENT_DRAFT.initialTopic,
      agent1Name:
        typeof parsed.agent1Name === 'string' ? parsed.agent1Name.slice(0, 40) : DEFAULT_AGENT_DRAFT.agent1Name,
      agent2Name:
        typeof parsed.agent2Name === 'string' ? parsed.agent2Name.slice(0, 40) : DEFAULT_AGENT_DRAFT.agent2Name,
      systemPrompt1:
        typeof parsed.systemPrompt1 === 'string'
          ? parsed.systemPrompt1.slice(0, 200)
          : DEFAULT_AGENT_DRAFT.systemPrompt1,
      systemPrompt2:
        typeof parsed.systemPrompt2 === 'string'
          ? parsed.systemPrompt2.slice(0, 200)
          : DEFAULT_AGENT_DRAFT.systemPrompt2
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
