<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import MessageCard from '@/components/MessageCard.svelte'
  import {
    SCENARIO_THEMES,
    PLACEHOLDER_INTERVAL_MS,
    getAgentPlaceholders,
    type ScenarioTheme
  } from '@/lib/config'
  import { t, i18n } from '@/lib/i18n/index.svelte'

  let {
    readonly = false,
    agent1Name = $bindable(t('agents.defaultAgent1')),
    agent2Name = $bindable(t('agents.defaultAgent2')),
    agent1Avatar = $bindable(''),
    agent2Avatar = $bindable(''),
    systemPrompt1 = $bindable(),
    systemPrompt2 = $bindable(),
    initialTopic = $bindable(''),
    isRunning = false,
    generatingTheme = null,
    randomErrorMessage = '',
    errorMessage = '',
    onrandom,
    onstart,
  }: {
    readonly?: boolean
    agent1Name?: string
    agent2Name?: string
    agent1Avatar?: string
    agent2Avatar?: string
    systemPrompt1: string
    systemPrompt2: string
    initialTopic?: string
    isRunning?: boolean
    generatingTheme?: ScenarioTheme | null
    randomErrorMessage?: string
    errorMessage?: string
    onrandom?: (theme: ScenarioTheme) => void
    onstart?: () => void
  } = $props()

  let isGeneratingRandom = $derived(generatingTheme !== null)
  let placeholderIndex = $state(0)

  const activePlaceholders = $derived(getAgentPlaceholders(i18n.currentLanguage))

  $effect(() => {
    if (readonly || !activePlaceholders) return

    const interval = setInterval(() => {
      placeholderIndex = (placeholderIndex + 1) % 10
    }, PLACEHOLDER_INTERVAL_MS)

    return () => clearInterval(interval)
  })

  function handleTopicInput(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement
    if (target.value.length > 200) {
      target.value = target.value.slice(0, 200)
    }
    initialTopic = target.value
  }

  const configs = $derived([
    {
      id: 'agent1' as const,
      name: agent1Name,
      value: systemPrompt1,
      avatar: agent1Avatar,
      placeholder: activePlaceholders
        ? activePlaceholders.agent1[placeholderIndex]
        : t('agents.descriptionPlaceholder'),
      oninput: (e: Event) => {
        const target = e.currentTarget as HTMLTextAreaElement
        if (target.value.length > 200) {
          target.value = target.value.slice(0, 200)
        }
        systemPrompt1 = target.value
        agent1Name = ''
      }
    },
    {
      id: 'agent2' as const,
      name: agent2Name,
      value: systemPrompt2,
      avatar: agent2Avatar,
      placeholder: activePlaceholders
        ? activePlaceholders.agent2[placeholderIndex]
        : t('agents.descriptionPlaceholder'),
      oninput: (e: Event) => {
        const target = e.currentTarget as HTMLTextAreaElement
        if (target.value.length > 200) {
          target.value = target.value.slice(0, 200)
        }
        systemPrompt2 = target.value
        agent2Name = ''
      }
    }
  ])
</script>

<wa-card appearance="filled">
  <Grid direction="column" gap="2xl">
    {#if !readonly}
      <h3 data-appearance="h5">{t('chat.fillOrChooseTheme')}</h3>
    {/if}
    
    <Grid direction="column">
      <div class="agents">
        {#each configs as config, index (config.id)}
          <div class={['agent', config.id === 'agent2' ? '--agent2' : '']}>
            <Grid direction="column" gap="s">
              {#if readonly}
                <div class="avatar">
                  <wa-avatar image={config.avatar}></wa-avatar>
                  <Grid direction="column" gap="xs">
                    <strong>{config.name}</strong>
                    <p class="u-text-small">{config.value}</p>
                  </Grid>
                </div>
              {:else}
                <h3 data-appearance="h4">{t('agents.cardTitle', { number: index + 1 })}</h3>
                <wa-textarea
                  class="wa-visually-hidden-label"
                  label={t('agents.descriptionLabel', { number: index + 1 })}
                  maxlength="200"
                  value={config.value}
                  oninput={config.oninput}
                  placeholder={config.placeholder}
                  disabled={isGeneratingRandom}
                ></wa-textarea>
                {#if config.id === 'agent1'}
                  <wa-textarea
                    maxlength="200"
                    value={initialTopic}
                    placeholder={t('chat.topicPlaceholder')}
                    rows="1"
                    oninput={handleTopicInput}
                    disabled={isGeneratingRandom}
                  ></wa-textarea>
                {/if}
              {/if}
            </Grid>
          </div>
        {/each}
      </div>

      {#if !readonly}

        <Grid justify="space-between">
          <wa-dropdown>
            <wa-button appearance="plain" slot="trigger" size="small" with-caret disabled={isRunning || isGeneratingRandom} loading={isRunning || isGeneratingRandom}>
              {t('chat.randomTopic')}
              <wa-icon slot="start" name="shuffle"></wa-icon>
            </wa-button>
            {#each SCENARIO_THEMES as theme (theme.id)}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <wa-dropdown-item
                class="random-button"
                role="button"
                tabindex="0"
                disabled={isGeneratingRandom}
                onclick={() => onrandom?.(theme.id)}
              >
                <wa-icon slot="icon" name={theme.icon} variant="solid"></wa-icon>
                {t(theme.labelKey)}
              </wa-dropdown-item>
            {/each}
          </wa-dropdown>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <Grid wrap={true} justify="end">
            <wa-button
              role="button"
              tabindex="0"
              variant="brand"
              disabled={isRunning || isGeneratingRandom}
              onclick={onstart}
            >
              <wa-icon slot="start" name="paper-plane" variant="solid"></wa-icon>
              {t('chat.start')}
            </wa-button>
          </Grid>
        </Grid>
      
        {#if randomErrorMessage}
          <wa-callout variant="danger">
            <wa-icon slot="start" name="triangle-exclamation" variant="solid"></wa-icon>
            <Grid direction="column" gap="xs">
              <strong>{t('chat.error')}</strong>
              <p>{randomErrorMessage}</p>
            </Grid>
          </wa-callout>
        {/if}
      
        {#if errorMessage}
          <wa-callout variant="danger">
            <wa-icon slot="start" name="triangle-exclamation" variant="solid"></wa-icon>
            <Grid direction="column" gap="xs">
              <strong>{t('chat.error')}</strong>
              <p>{errorMessage}</p>
            </Grid>
          </wa-callout>
        {/if}
      
      {/if}
    </Grid>
  </Grid>
</wa-card>


<style>
wa-card {
  container-type: inline-size;
}
.agents {
  display: flex;
  gap: var(--wa-space-xl);
  @container (width < 50rem) {
    flex-direction: column;
  }
}
wa-textarea {
  &::part(textarea) {
    field-sizing: content;
    resize: none;
  }
}
:global(.chat-item) wa-textarea {
  &::part(textarea) {
    field-sizing: content;
    resize: none;
  }
  &::part(base) {
    border-radius: var(--wa-border-radius-s) var(--wa-border-radius-xl) var(--wa-border-radius-xl);
    background-color: var(--wa-color-secondary-30);
    @media (prefers-color-scheme: light) {
      background-color: var(--wa-color-secondary-80);
    }
  }
}
.random-button {
  @media (max-width: 600px) {
    font-size: var(--wa-font-size-s);
  }
}
.random-button {
  @media (max-width: 500px) {
    font-size: var(--wa-font-size-xs);
  }
}
.avatar {
  --avatar-size: 8rem;
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: var(--wa-space-s);
  @container (width > 40rem) {
    display: grid;
    grid-template-columns: var(--avatar-size) 1fr;
  }
}
wa-avatar {
  --size: var(--avatar-size);
}
.agent {
  flex: 1;
}
.--agent2 {
  wa-textarea {
    --wa-form-control-background-color: var(--wa-color-secondary-30);
    @media (prefers-color-scheme: light) {
      --wa-form-control-background-color: var(--wa-color-secondary-80);
    }
  }
}
</style>
