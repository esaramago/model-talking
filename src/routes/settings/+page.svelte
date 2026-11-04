<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import Grid from '@/components/ui/Grid.svelte'
  import Heading from '@/components/ui/Heading.svelte'
  import {
    DEFAULT_SETTINGS,
    SUPPORTED_LANGUAGES,
    GENERAL_RULES_MAX_CHARS,
    MESSAGE_MAX_CHARS_MIN,
    MESSAGE_MAX_CHARS_MAX,
    MESSAGE_MAX_CHARS_STEP
  } from '@/lib/config'
  import { loadSettings, saveSettings } from '@/lib/storage'
  import { i18n, t } from '@/lib/i18n/index.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'

  const user = $derived(page.data?.user ?? null)
  const initialSettings = loadSettings(page.data?.user?.id, page.data?.user)

  let language = $state(initialSettings.language)
  let generalRules = $state(initialSettings.generalRules)
  let maxChars = $state(initialSettings.maxChars)
  let isHydrated = $state(false)
  let lastSyncedUserId = $state<string | null | undefined>(undefined)

  let selectEl = $state<HTMLElement | null>(null)
  let textareaEl = $state<HTMLElement | null>(null)
  let sliderEl = $state<HTMLElement | null>(null)

  function applySettings(userId?: string | null, fallback?: any) {
    const loaded = loadSettings(userId, fallback)
    language = loaded.language
    generalRules = loaded.generalRules
    maxChars = loaded.maxChars
    i18n.setLanguage(loaded.language)

    if (typeof window !== 'undefined' && 'customElements' in window) {
      customElements.whenDefined('wa-select').then(() => {
        if (selectEl && 'value' in selectEl) {
          ;(selectEl as any).value = loaded.language
        }
      })
      customElements.whenDefined('wa-textarea').then(() => {
        if (textareaEl && 'value' in textareaEl) {
          ;(textareaEl as any).value = loaded.generalRules
        }
      })
      customElements.whenDefined('wa-slider').then(() => {
        if (sliderEl && 'value' in sliderEl) {
          ;(sliderEl as any).value = loaded.maxChars
        }
      })
    }
  }

  onMount(async () => {
    applySettings(user?.id, user)
    lastSyncedUserId = user?.id ?? null
    if (typeof window !== 'undefined' && 'customElements' in window) {
      await Promise.all([
        customElements.whenDefined('wa-select'),
        customElements.whenDefined('wa-textarea'),
        customElements.whenDefined('wa-slider')
      ])
    }
    setTimeout(() => {
      isHydrated = true
    }, 50)
  })

  $effect(() => {
    const currentUserId = user?.id ?? null
    if (lastSyncedUserId === undefined) {
      lastSyncedUserId = currentUserId
      applySettings(currentUserId, user)
    } else if (lastSyncedUserId !== currentUserId) {
      lastSyncedUserId = currentUserId
      applySettings(currentUserId, user)
    }
  })

  function persistCurrentSettings() {
    if (!isHydrated) return
    const current = loadSettings(user?.id, user)
    saveSettings({
      ...current,
      language,
      generalRules,
      maxChars
    }, user?.id)
  }

  function handleLanguageChange(e: Event) {
    if (!isHydrated) return
    const target = e.target as HTMLElement & { value?: string }
    const currentTarget = e.currentTarget as HTMLElement & { value?: string }
    const newLang = target?.value || currentTarget?.value || DEFAULT_SETTINGS.language
    if (!newLang) return
    language = newLang
    i18n.setLanguage(newLang)
    persistCurrentSettings()
  }

  function handleGeneralRulesInput(e: Event) {
    if (!isHydrated) return
    const target = (e.currentTarget || e.target) as HTMLTextAreaElement
    let val = target?.value ?? ''
    if (val.length > GENERAL_RULES_MAX_CHARS) {
      val = val.slice(0, GENERAL_RULES_MAX_CHARS)
      target.value = val
    }
    generalRules = val
    persistCurrentSettings()
  }

  function handleMaxCharsInput(e: Event) {
    if (!isHydrated) return
    const target = (e.target || e.currentTarget) as HTMLElement & { value?: number | string }
    const val = Number(target?.value)
    if (!isNaN(val)) {
      maxChars = Math.min(Math.max(Math.round(val), MESSAGE_MAX_CHARS_MIN), MESSAGE_MAX_CHARS_MAX)
    }
  }

  function handleMaxCharsChange(e: Event) {
    if (!isHydrated) return
    const target = (e.target || e.currentTarget) as HTMLElement & { value?: number | string }
    const val = Number(target?.value)
    if (isNaN(val)) return
    maxChars = Math.min(Math.max(Math.round(val), MESSAGE_MAX_CHARS_MIN), MESSAGE_MAX_CHARS_MAX)
    persistCurrentSettings()
  }
</script>

<HeadMeta
  title={t('settings.title')}
  description={t('settings.subtitle')}
/>

<div class="l-container l-container--s">
  <Grid direction="column" gap="l">

    <Heading title={t('settings.title')} subtitle={t('settings.subtitle')} />

    <wa-card>
      <Grid direction="column" gap="s">
        <h2 data-appearance="h4">{t('settings.language')}</h2>
        <wa-select
          bind:this={selectEl}
          label={t('settings.languageLabel')}
          value={language}
          hint={t('settings.languageHint')}
          onchange={handleLanguageChange}
          oninput={handleLanguageChange}
        >
          {#each SUPPORTED_LANGUAGES as lang}
            <wa-option value={lang.value}>{lang.label}</wa-option>
          {/each}
        </wa-select>
      </Grid>
    </wa-card>

    <wa-card>
      <Grid direction="column" gap="s">
        <h2 data-appearance="h4">{t('settings.generalRules')}</h2>
        <wa-textarea
          bind:this={textareaEl}
          label={t('settings.generalRulesLabel')}
          value={generalRules}
          maxlength={GENERAL_RULES_MAX_CHARS}
          rows="2"
          placeholder={t('settings.generalRulesPlaceholder')}
          hint={t('settings.generalRulesHint', { current: generalRules.length, max: GENERAL_RULES_MAX_CHARS })}
          oninput={handleGeneralRulesInput}
          onchange={handleGeneralRulesInput}
        ></wa-textarea>
      </Grid>
    </wa-card>

    <wa-card>
      <Grid direction="column" gap="s">
        <h2 data-appearance="h4">{t('settings.maxChars')}</h2>
        <wa-slider
          bind:this={sliderEl}
          label={t('settings.maxCharsLabel')}
          value={maxChars}
          min={MESSAGE_MAX_CHARS_MIN}
          max={MESSAGE_MAX_CHARS_MAX}
          step={MESSAGE_MAX_CHARS_STEP}
          with-tooltip
          hint={t('settings.maxCharsHint')}
          oninput={handleMaxCharsInput}
          onchange={handleMaxCharsChange}
        ></wa-slider>
        <strong>{maxChars}</strong>
      </Grid>
    </wa-card>
  </Grid>
</div>
