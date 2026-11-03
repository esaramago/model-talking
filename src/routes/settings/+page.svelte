<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import Grid from '@/components/ui/Grid.svelte'
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

  const user = $derived(page.data?.user ?? null)
  const isGuest = $derived(!user)

  let language = $state(DEFAULT_SETTINGS.language)
  let generalRules = $state(DEFAULT_SETTINGS.generalRules)
  let maxChars = $state(DEFAULT_SETTINGS.maxChars)
  let isHydrated = $state(false)
  let lastSyncedUserId = $state<string | null | undefined>(undefined)

  function applySettings(userId?: string | null, fallback?: any) {
    const loaded = loadSettings(userId, fallback)
    language = loaded.language
    generalRules = userId ? loaded.generalRules : DEFAULT_SETTINGS.generalRules
    maxChars = loaded.maxChars
    i18n.setLanguage(loaded.language)
  }

  onMount(() => {
    applySettings(user?.id, user)
    lastSyncedUserId = user?.id ?? null
    isHydrated = true
  })

  $effect(() => {
    const currentUserId = user?.id ?? null
    if (lastSyncedUserId === undefined) {
      lastSyncedUserId = currentUserId
    } else if (lastSyncedUserId !== currentUserId) {
      lastSyncedUserId = currentUserId
      applySettings(currentUserId, user)
    }
  })

  function handleLanguageChange(e: Event) {
    const target = e.target as HTMLElement & { value?: string }
    const currentTarget = e.currentTarget as HTMLElement & { value?: string }
    const newLang = target?.value || currentTarget?.value || DEFAULT_SETTINGS.language
    if (!newLang) return
    language = newLang
    i18n.setLanguage(newLang)
    const current = loadSettings(user?.id, user)
    saveSettings({
      ...current,
      language: newLang
    }, user?.id)
  }

  function handleGeneralRulesInput(e: Event) {
    if (isGuest) return
    const target = e.currentTarget as HTMLTextAreaElement
    if (target.value.length > GENERAL_RULES_MAX_CHARS) {
      target.value = target.value.slice(0, GENERAL_RULES_MAX_CHARS)
    }
    generalRules = target.value
    if (!isHydrated) return
    const current = loadSettings(user?.id, user)
    saveSettings({
      ...current,
      generalRules
    }, user?.id)
  }

  function handleMaxCharsInput(e: Event) {
    const target = e.target as HTMLElement & { value?: number | string }
    const val = Number(target?.value)
    if (!isNaN(val)) {
      maxChars = Math.min(Math.max(Math.round(val), MESSAGE_MAX_CHARS_MIN), MESSAGE_MAX_CHARS_MAX)
    }
  }

  function handleMaxCharsChange(e: Event) {
    const target = e.target as HTMLElement & { value?: number | string }
    const val = Number(target?.value)
    if (isNaN(val)) return
    const clamped = Math.min(Math.max(Math.round(val), MESSAGE_MAX_CHARS_MIN), MESSAGE_MAX_CHARS_MAX)
    maxChars = clamped
    if (!isHydrated) return
    const current = loadSettings(user?.id, user)
    saveSettings({
      ...current,
      maxChars: clamped
    }, user?.id)
  }
</script>

<div class="l-container l-container--s">
  <Grid direction="column" gap="l">
    <Grid direction="column" gap="xs">
      <h1 data-appearance="h2">{t('settings.title')}</h1>
      <p>{t('settings.subtitle')}</p>
    </Grid>

    <wa-card>
      <Grid direction="column" gap="s">
        <h2 data-appearance="h4">{t('settings.language')}</h2>
        <wa-select
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
          label={t('settings.generalRulesLabel')}
          value={generalRules}
          maxlength={GENERAL_RULES_MAX_CHARS}
          rows="2"
          placeholder={t('settings.generalRulesPlaceholder')}
          hint={t('settings.generalRulesHint', { current: generalRules.length, max: GENERAL_RULES_MAX_CHARS })}
          disabled={isGuest}
          oninput={handleGeneralRulesInput}
        ></wa-textarea>
      </Grid>
    </wa-card>

    <wa-card>
      <Grid direction="column" gap="s">
        <h2 data-appearance="h4">{t('settings.maxChars')}</h2>
        <wa-slider
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
