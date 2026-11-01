<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import Grid from '@/components/ui/Grid.svelte'
  import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/storage'
  import { SUPPORTED_LANGUAGES } from '@/lib/chat'

  const user = $derived(page.data?.user ?? null)

  let model = $state(DEFAULT_SETTINGS.model)
  let language = $state(DEFAULT_SETTINGS.language)
  let maxTurns = $state(DEFAULT_SETTINGS.maxTurns)
  let maxTokens = $state(DEFAULT_SETTINGS.maxTokens)
  let generalRules = $state(DEFAULT_SETTINGS.generalRules)
  let isHydrated = $state(false)

  const generalRulesMaxChars = 120

  function applySettings(userId?: string | null, fallback?: any) {
    const loaded = loadSettings(userId, fallback)
    model = loaded.model
    language = loaded.language
    maxTurns = loaded.maxTurns
    maxTokens = loaded.maxTokens
    generalRules = loaded.generalRules
  }

  onMount(() => {
    applySettings(user?.id, user?.settings)
    isHydrated = true
  })

  $effect(() => {
    const currentUserId = user?.id ?? null
    const userSettings = user?.settings ?? null
    applySettings(currentUserId, userSettings)
  })

  function handleModelInput(e: Event) {
    model = (e.currentTarget as HTMLInputElement).value
    if (!isHydrated) return
    const current = loadSettings(user?.id, user?.settings)
    saveSettings({
      ...current,
      model
    }, user?.id)
  }

  function handleLanguageChange(e: Event) {
    const target = e.currentTarget as HTMLElement & { value: string }
    language = target.value || DEFAULT_SETTINGS.language
    if (!isHydrated) return
    const current = loadSettings(user?.id, user?.settings)
    saveSettings({
      ...current,
      language
    }, user?.id)
  }

  function handleGeneralRulesInput(e: Event) {
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

  function handleMaxTurnsInput(e: Event) {
    maxTurns = Number((e.currentTarget as HTMLInputElement).value) || DEFAULT_SETTINGS.maxTurns
    if (!isHydrated) return
    const current = loadSettings(user?.id, user?.settings)
    saveSettings({
      ...current,
      maxTurns
    }, user?.id)
  }

  function handleMaxTokensInput(e: Event) {
    maxTokens = Number((e.currentTarget as HTMLInputElement).value) || DEFAULT_SETTINGS.maxTokens
    if (!isHydrated) return
    const current = loadSettings(user?.id, user?.settings)
    saveSettings({
      ...current,
      maxTokens
    }, user?.id)
  }

  function handleReset() {
    model = DEFAULT_SETTINGS.model
    language = DEFAULT_SETTINGS.language
    maxTurns = DEFAULT_SETTINGS.maxTurns
    maxTokens = DEFAULT_SETTINGS.maxTokens
    generalRules = DEFAULT_SETTINGS.generalRules
    if (!isHydrated) return
    saveSettings({
      ...DEFAULT_SETTINGS
    }, user?.id)
  }
</script>

<Grid direction="column" gap="l">
  <Grid direction="column" gap="xs">
    <h1 data-appearance="h2">Definições</h1>
    <p>Configurações gerais para os modelos de conversação.</p>
  </Grid>

  <wa-card>
    <Grid direction="column" gap="s">
      <h2 data-appearance="h4">Modelo de IA</h2>
      <wa-input
        label="Modelo"
        value={model}
        placeholder="ex: meta-llama/llama-3.3-70b-instruct:free"
        hint="Modelo utilizado por ambos os conversadores."
        oninput={handleModelInput}
      ></wa-input>
    </Grid>
  </wa-card>

  <wa-card>
    <Grid direction="column" gap="s">
      <h2 data-appearance="h4">Idioma</h2>
      <wa-select
        label="Idioma das Conversas"
        value={language}
        hint="Idioma utilizado pelos agentes no diálogo."
        onchange={handleLanguageChange}
      >
        {#each SUPPORTED_LANGUAGES as lang}
          <wa-option value={lang.value}>{lang.label}</wa-option>
        {/each}
      </wa-select>
    </Grid>
  </wa-card>

  <wa-card>
    <Grid direction="column" gap="s">
      <h2 data-appearance="h4">Regras Gerais</h2>
      <wa-textarea
        label="Regras Gerais para os Agentes"
        value={generalRules}
        maxlength="generalRulesMaxChars"
        rows="2"
        placeholder="ex: Responde sempre em português e de forma concisa."
        hint={`Regras adicionadas à descrição dos agentes (${generalRules.length}/${generalRulesMaxChars} caracteres).`}
        oninput={handleGeneralRulesInput}
      ></wa-textarea>
    </Grid>
  </wa-card>

  <wa-card>
    <Grid direction="column" gap="s">
      <h2 data-appearance="h4">Proteção de Tokens</h2>
      <Grid fullWidth break="small">
        <wa-input
          label="Máximo de Turnos"
          type="number"
          min="2"
          max="20"
          value={String(maxTurns)}
          hint="Limite total de respostas trocadas (evita loop infinito)"
          oninput={handleMaxTurnsInput}
        ></wa-input>

        <wa-input
          label="Máximo de Tokens por resposta"
          type="number"
          min="50"
          max="1000"
          step="50"
          value={String(maxTokens)}
          hint="Restringe o tamanho de cada resposta individual."
          oninput={handleMaxTokensInput}
        ></wa-input>
          
      </Grid>
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
      Restaurar Predefinições
    </wa-button>
  </Grid>
</Grid>
