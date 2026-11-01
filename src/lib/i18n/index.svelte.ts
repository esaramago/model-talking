import type { SupportedLanguage, TranslationKey, TranslationSchema } from './types'
import { ptPT } from './locales/pt-PT'
import { en } from './locales/en'
import { es } from './locales/es'
import { fr } from './locales/fr'
import { de } from './locales/de'
import { it } from './locales/it'

export * from './types'

const LOCALES: Record<SupportedLanguage, TranslationSchema> = {
  'pt-PT': ptPT,
  en,
  es,
  fr,
  de,
  it
}

const SUPPORTED_LANGUAGE_CODES: SupportedLanguage[] = ['pt-PT', 'en', 'es', 'fr', 'de', 'it']

export function isSupportedLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === 'string' && SUPPORTED_LANGUAGE_CODES.includes(lang as SupportedLanguage)
}

function getNestedValue(obj: Record<string, any>, path: string): string | undefined {
  const parts = path.split('.')
  let current: any = obj
  for (const part of parts) {
    if (current === undefined || current === null) return undefined
    current = current[part]
  }
  return typeof current === 'string' ? current : undefined
}

export class I18nState {
  currentLanguage = $state<SupportedLanguage>('pt-PT')

  constructor() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('model_talks_lang')
        if (stored && isSupportedLanguage(stored)) {
          this.currentLanguage = stored
        }
      } catch {
        // Ignore local storage error
      }
    }
  }

  setLanguage(lang: string | undefined | null) {
    if (!lang) return
    const resolved: SupportedLanguage = isSupportedLanguage(lang) ? lang : 'pt-PT'
    this.currentLanguage = resolved

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('model_talks_lang', resolved)
        document.documentElement.lang = resolved
      } catch {
        // Ignore local storage error
      }
    }
  }

  t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const lang = this.currentLanguage
    const dict = LOCALES[lang] || LOCALES['pt-PT']
    let value = getNestedValue(dict as unknown as Record<string, any>, key)

    if (value === undefined) {
      value = getNestedValue(LOCALES['pt-PT'] as unknown as Record<string, any>, key) || key
    }

    if (!params) return value

    return value.replace(/{([a-zA-Z0-9_]+)}/g, (match, paramKey) => {
      return paramKey in params ? String(params[paramKey]) : match
    })
  }
}

export const i18n = new I18nState()
export const t = (key: TranslationKey, params?: Record<string, string | number>): string => i18n.t(key, params)
