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

function clampMaxChars(value: unknown): number {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(num)) return DEFAULT_SETTINGS.maxChars
  return Math.min(Math.max(Math.round(num), MESSAGE_MAX_CHARS_MIN), MESSAGE_MAX_CHARS_MAX)
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
    maxChars: clampMaxChars(settings.maxChars)
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
    return parsed && typeof parsed === 'object' ? parsed : null
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
    localStorage.setItem(getStorageKey(userId), JSON.stringify(settings))
  } catch {
    // Fail silently
  }
}

function isValidMaxChars(val: unknown): val is number {
  return typeof val === 'number' && val >= MESSAGE_MAX_CHARS_MIN && val <= MESSAGE_MAX_CHARS_MAX
}

export function loadSettings(
  userId?: string | null,
  userFallback?: { language?: string; generalRules?: string; maxChars?: number; [key: string]: any } | null
): ChatSettings {
  const isBrowser = typeof window !== 'undefined'
  const effectiveUserId = userId || (isBrowser ? pb.authStore.record?.id : null)
  const effectiveFallback = userFallback || (isBrowser ? pb.authStore.record : null)
  const local = loadLocalSettings(effectiveUserId)

  let language = DEFAULT_SETTINGS.language
  let generalRules = DEFAULT_SETTINGS.generalRules
  let maxChars = DEFAULT_SETTINGS.maxChars

  if (effectiveUserId) {
    const cached = userSettingsCache.get(effectiveUserId)
    if (cached) {
      ;({ language, generalRules, maxChars } = cached)
    }

    const source =
      isBrowser && pb.authStore.record?.id === effectiveUserId
        ? pb.authStore.record
        : !cached
          ? effectiveFallback
          : null

    if (source && typeof source === 'object') {
      if (typeof source.language === 'string' && source.language.trim()) {
        language = source.language.trim()
      }
      if (typeof source.generalRules === 'string') {
        generalRules = source.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
      }
      if (isValidMaxChars(source.maxChars)) {
        maxChars = source.maxChars
      }
    }
  } else if (isBrowser && typeof localStorage !== 'undefined') {
    try {
      const storedLang = localStorage.getItem('model_talks_lang')
      if (storedLang) language = storedLang
    } catch {
      // Fail silently
    }
  } else if (guestSettings) {
    ;({ language, generalRules, maxChars } = guestSettings)
  }

  if (local) {
    if (typeof local.generalRules === 'string' && (!generalRules || generalRules === DEFAULT_SETTINGS.generalRules)) {
      generalRules = local.generalRules.slice(0, GENERAL_RULES_MAX_CHARS)
    }
    if (typeof local.language === 'string' && local.language.trim() && (!language || language === DEFAULT_SETTINGS.language)) {
      language = local.language.trim()
    }
    if (isValidMaxChars(local.maxChars) && maxChars === DEFAULT_SETTINGS.maxChars) {
      maxChars = local.maxChars
    }
  }

  const result = sanitizeSettings({ generalRules, language, maxChars })

  if (effectiveUserId) {
    userSettingsCache.set(effectiveUserId, result)
  } else {
    guestSettings = result
  }

  return result
}

export function saveSettings(settings: ChatSettings, userId?: string | null): void {
  const sanitized = sanitizeSettings(settings)

  saveLocalSettings(sanitized, userId)

  if (userId) {
    userSettingsCache.set(userId, sanitized)
  } else {
    guestSettings = sanitized
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
