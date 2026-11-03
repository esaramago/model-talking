<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import { t } from '@/lib/i18n/index.svelte'
  import { AVAILABLE_PERSONAS } from '@/lib/config'
  import { getPersonaImageUrl } from '@/lib/randomConversations'

  let {
    open = $bindable(false),
    title = t('agents.selectAvatar'),
    cancelText = t('confirmation.cancel'),
    value = '',
    onselect,
    oncancel,
  }: {
    open: boolean
    title?: string
    cancelText?: string
    value?: string
    onselect?: (avatar: string) => void
    oncancel?: () => void
  } = $props()

  let dialogEl = $state<(HTMLElement & { open: boolean }) | null>(null)

  $effect(() => {
    if (dialogEl && dialogEl.open !== open) {
      dialogEl.open = open
    }
  })

  function handleSelect(avatarUrl: string) {
    open = false
    onselect?.(avatarUrl)
  }

  function handleClose() {
    open = false
    oncancel?.()
  }

  function handleWaHide() {
    open = false
    oncancel?.()
  }
</script>

<wa-dialog
  bind:this={dialogEl}
  label={title}
  open={open || undefined}
  light-dismiss
  with-footer
  onwa-hide={handleWaHide}
>
  <Grid wrap={true} justify="center" gap="xl">
    {#each AVAILABLE_PERSONAS as personaId (personaId)}
      {@const avatarUrl = getPersonaImageUrl(personaId)}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <button
        type="button"
        title={`Escolha o avatar ${personaId}`}
        class={value === avatarUrl ? '--active' : ''}
        onclick={() => handleSelect(avatarUrl)}
      >
        <wa-avatar image={avatarUrl}></wa-avatar>
      </button>
    {/each}
  </Grid>

  <div slot="footer">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <Grid justify="end">
      <wa-button
        role="button"
        tabindex="0"
        variant="neutral"
        appearance="outlined"
        onclick={handleClose}
      >
        {cancelText}
      </wa-button>
    </Grid>
  </div>
</wa-dialog>

<style>
wa-avatar {
  --size: 8rem;
  transition: background-color .2s;
}
wa-dialog {
  --width: 40rem;
}
button {
  height: auto;
  &:hover wa-avatar {
    background-color: var(--wa-color-brand-40);
  }
  &.--active wa-avatar {
    background-color: var(--wa-color-brand-60);
  }
}
</style>