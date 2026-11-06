import { describe, it, expect } from 'vitest'
import { isSupportedLanguage } from './index.svelte'
import { en } from './locales/en'
import { ptPT } from './locales/pt-PT'
import { es } from './locales/es'
import { fr } from './locales/fr'
import { de } from './locales/de'
import { it as italian } from './locales/it'
import { tr } from './locales/tr'
import { ru } from './locales/ru'
import { ar } from './locales/ar'

describe('i18n utilities', () => {
  it('correctly identifies supported languages', () => {
    expect(isSupportedLanguage('pt-PT')).toBe(true)
    expect(isSupportedLanguage('en')).toBe(true)
    expect(isSupportedLanguage('es')).toBe(true)
    expect(isSupportedLanguage('fr')).toBe(true)
    expect(isSupportedLanguage('de')).toBe(true)
    expect(isSupportedLanguage('it')).toBe(true)
    expect(isSupportedLanguage('tr')).toBe(true)
    expect(isSupportedLanguage('ru')).toBe(true)
    expect(isSupportedLanguage('ar')).toBe(true)

    expect(isSupportedLanguage('zh')).toBe(false)
    expect(isSupportedLanguage('unknown')).toBe(false)
    expect(isSupportedLanguage(123)).toBe(false)
    expect(isSupportedLanguage(null)).toBe(false)
  })

  it('ensures all locales contain required top-level translation sections', () => {
    const locales = [en, ptPT, es, fr, de, italian, tr, ru, ar]
    const requiredSections = [
      'header',
      'sidebar',
      'chat',
      'agents',
      'settings',
      'confirmation',
      'login',
      'register',
      'profile',
      'terms',
      'privacy',
      'about',
      'footer'
    ] as const

    for (const locale of locales) {
      for (const section of requiredSections) {
        expect(locale).toHaveProperty(section)
        expect(typeof locale[section]).toBe('object')
      }
    }
  })
})
