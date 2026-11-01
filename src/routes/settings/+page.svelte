<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import Grid from '@/components/ui/Grid.svelte'
  import { DEFAULT_SETTINGS, SUPPORTED_LANGUAGES } from '@/lib/config'
  import { loadSettings, saveSettings } from '@/lib/storage'
  import { i18n, t } from '@/lib/i18n/index.svelte'

  const user = $derived(page.data?.user ?? null)
  const isGuest = $derived(!user)

  let language = $state(DEFAULT_SETTINGS.language)
  let generalRules = $state(DEFAULT_SETTINGS.generalRules)
  let isHydrated = $state(false)
  let lastSyncedUserId = $state<string | null | undefined>(undefined)

  const generalRulesMaxChars = 120

  function applySettings(userId?: string | null, fallback?: any) {
    const loaded = loadSettings(userId, fallback)
    language = loaded.language
    generalRules = userId ? loaded.generalRules : DEFAULT_SETTINGS.generalRules
    i18n.setLanguage(loaded.language)
  }

  onMount(() => {
    applySettings(user?.id, user?.settings)
    lastSyncedUserId = user?.id ?? null
    isHydrated = true
  })

  $effect(() => {
    const currentUserId = user?.id ?? null
    const userSettings = user?.settings ?? null
    if (lastSyncedUserId === undefined) {
      lastSyncedUserId = currentUserId
    } else if (lastSyncedUserId !== currentUserId) {
      lastSyncedUserId = currentUserId
      applySettings(currentUserId, userSettings)
    }
  })

  function handleLanguageChange(e: Event) {
    const target = e.target as HTMLElement & { value?: string }
    const currentTarget = e.currentTarget as HTMLElement & { value?: string }
    const newLang = target?.value || currentTarget?.value || DEFAULT_SETTINGS.language
    if (!newLang) return
    language = newLang
    i18n.setLanguage(newLang)
    const current = loadSettings(user?.id, user?.settings)
    saveSettings({
      ...current,
      language: newLang
    }, user?.id)
  }

  function handleGeneralRulesInput(e: Event) {
    if (isGuest) return
    const target = e.currentTarget as HTMLTextAreaElement
    if (target.value.length > generalRulesMaxChars) {
      target.value = target.value.slice(0, generalRulesMaxChars)
    }
    generalRules = target.value
    if (!isHydrated) return
    const current = loadSettings(user?.id, user?.settings)
    saveSettings({
      ...current,
      generalRules
    }, user?.id)
  }

  function handleReset() {
    language = DEFAULT_SETTINGS.language
    generalRules = DEFAULT_SETTINGS.generalRules
    i18n.setLanguage(DEFAULT_SETTINGS.language)
    if (!isHydrated) return
    saveSettings({
      ...DEFAULT_SETTINGS
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
          maxlength={generalRulesMaxChars}
          rows="2"
          placeholder={t('settings.generalRulesPlaceholder')}
          hint={t('settings.generalRulesHint', { current: generalRules.length, max: generalRulesMaxChars })}
          disabled={isGuest}
          oninput={handleGeneralRulesInput}
        ></wa-textarea>
      </Grid>
    </wa-card>

    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <Grid align="center" gap="s">
      <wa-button
        role="button"
        tabindex="0"
        variant="neutral"
        appearance="outlined"
        onclick={handleReset}
      >
        <wa-icon slot="start" name="arrow-rotate-left" variant="solid"></wa-icon>
        {t('settings.restoreDefaults')}
      </wa-button>
    </Grid>
  </Grid>
</div>