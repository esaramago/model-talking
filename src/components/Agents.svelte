<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import AvatarPicker from '@/components/AvatarPicker.svelte'
  import { t } from '@/lib/i18n/index.svelte'

  let {
    readonly = false,
    agent1Name = $bindable(t('agents.defaultAgent1')),
    agent2Name = $bindable(t('agents.defaultAgent2')),
    agent1Avatar = $bindable('/img/personas/1.svg'),
    agent2Avatar = $bindable('/img/personas/2.svg'),
    systemPrompt1 = $bindable(),
    systemPrompt2 = $bindable(),
  }: {
    readonly?: boolean,
    agent1Name?: string
    agent2Name?: string
    agent1Avatar?: string
    agent2Avatar?: string
    systemPrompt1: string
    systemPrompt2: string
  } = $props()

  let isAvatarPickerOpen = $state(false)
  let activeAvatarAgent = $state<'agent1' | 'agent2'>('agent1')

  const currentSelectedAvatar = $derived(
    activeAvatarAgent === 'agent1' ? agent1Avatar : agent2Avatar
  )

  function openAvatarPicker(agentId: 'agent1' | 'agent2') {
    activeAvatarAgent = agentId
    isAvatarPickerOpen = true
  }

  function handleAvatarSelect(newAvatar: string) {
    if (activeAvatarAgent === 'agent1') {
      agent1Avatar = newAvatar
    } else {
      agent2Avatar = newAvatar
    }
  }

  const configs = $derived([
    {
      id: 'agent1' as const,
      name: agent1Name,
      value: systemPrompt1,
      avatar: agent1Avatar,
      onNameInput: (e: Event) => {
        agent1Name = (e.currentTarget as HTMLInputElement).value
      },
      oninput: (e: Event) => {
        const target = e.currentTarget as HTMLTextAreaElement
        if (target.value.length > 200) {
          target.value = target.value.slice(0, 200)
        }
        systemPrompt1 = target.value
      }
    },
    {
      id: 'agent2' as const,
      name: agent2Name,
      value: systemPrompt2,
      avatar: agent2Avatar,
      onNameInput: (e: Event) => {
        agent2Name = (e.currentTarget as HTMLInputElement).value
      },
      oninput: (e: Event) => {
        const target = e.currentTarget as HTMLTextAreaElement
        if (target.value.length > 200) {
          target.value = target.value.slice(0, 200)
        }
        systemPrompt2 = target.value
      }
    }
  ])
</script>

<Grid wrap={true} break="small" fullWidth>
  {#each configs as config, index (config.id)}
    <wa-card class={config.id === 'agent1' ? '--brand' : ''}>

      <Grid direction="column" gap="s">

        {#if readonly}
          <div class="avatar">
            <wa-avatar image={config.avatar}></wa-avatar>
            <Grid direction="column" gap="xs">
              <strong>{config.name}</strong>
              <p>{config.value}</p>
            </Grid>
          </div>
        {:else}
          <h3 data-appearance="h4">{t('agents.cardTitle', { number: index + 1 })}</h3>
          <div class="avatar">
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <button
              type="button"
              title={t('agents.changeAvatar', { number: index + 1 })}
              onclick={() => openAvatarPicker(config.id)}
              class="avatar-button"
            >
              <wa-avatar
                image={config.avatar}
              ></wa-avatar>
            </button>
            <wa-input
              class="wa-visually-hidden-label"
              label={t('agents.nameLabel', { number: index + 1 })}
              placeholder={t('agents.namePlaceholder')}
              maxlength="40"
              value={config.name}
              oninput={config.onNameInput}
            ></wa-input>
          </div>
          <wa-textarea
            class="wa-visually-hidden-label"
            label={t('agents.descriptionLabel', { number: index + 1 })}
            maxlength="200"
            value={config.value}
            oninput={config.oninput}
            placeholder={t('agents.descriptionPlaceholder')}
          ></wa-textarea>
        {/if}
      </Grid>
    </wa-card>
  {/each}
</Grid>

{#if !readonly}
  <AvatarPicker
    bind:open={isAvatarPickerOpen}
    value={currentSelectedAvatar}
    onselect={handleAvatarSelect}
  />
{/if}

<style>
wa-card {
  container-type: inline-size;
}
wa-textarea {
  &::part(textarea) {
    field-sizing: content;
    resize: none;
  }
}
.avatar {
  --avatar-size: 5rem;
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: var(--wa-space-s);
  @container (width > 40rem) {
    display: grid;
    grid-template-columns: var(--avatar-size) 1fr;
    --avatar-size: 4rem;
  }
}
wa-avatar {
  --size: var(--avatar-size);
}
.avatar-button {
  height: auto;
  &:hover wa-avatar {
    background-color: var(--wa-color-brand-40);
  }
}
.--brand {
  background-color: var(--wa-color-brand-30);
  @media (prefers-color-scheme: light) {
    background-color: var(--wa-color-brand-80);
  }

  wa-textarea,
  wa-input {
    --wa-form-control-background-color: var(--wa-color-brand-30);
    @media (prefers-color-scheme: light) {
      --wa-form-control-background-color: var(--wa-color-brand-80);
    }
  }
}
</style>
