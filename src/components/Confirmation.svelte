<script lang="ts">
  import type { Snippet } from 'svelte'
  import Grid from '@/components/ui/Grid.svelte'
  import { t } from '@/lib/i18n/index.svelte'

  let {
    open = $bindable(false),
    title = t('confirmation.title'),
    message = '',
    confirmText = t('confirmation.confirm'),
    cancelText = t('confirmation.cancel'),
    confirmVariant = 'brand',
    loading = false,
    onconfirm,
    oncancel,
    children,
    width = '31rem'
  }: {
    open: boolean
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    confirmVariant?: 'brand' | 'danger' | 'neutral' | 'success' | 'warning'
    loading?: boolean
    onconfirm?: () => void
    oncancel?: () => void
    children?: Snippet
    width?: string
  } = $props()

  let dialogEl = $state<(HTMLElement & { open: boolean }) | null>(null)

  $effect(() => {
    if (dialogEl && dialogEl.open !== open) {
      dialogEl.open = open
    }
  })

  function handleCancel() {
    open = false
    oncancel?.()
  }

  function handleConfirm() {
    onconfirm?.()
  }
</script>

<wa-dialog
  bind:this={dialogEl}
  label={title}
  open={open || undefined}
  light-dismiss
  with-footer
  onwa-hide={handleCancel}
  style={width ? `--width: ${width}` : ''}
>
  <Grid direction="column">
    {#if message}
      <p>{message}</p>
    {/if}
    {@render children?.()}
  </Grid>

  <div slot="footer">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <Grid justify="end" gap="s">
      <wa-button
        role="button"
        tabindex="0"
        variant="neutral"
        appearance="outlined"
        disabled={loading}
        onclick={handleCancel}
      >
        {cancelText}
      </wa-button>
      <wa-button
        role="button"
        tabindex="0"
        variant={confirmVariant}
        {loading}
        onclick={handleConfirm}
      >
        {confirmText}
      </wa-button>
    </Grid>
  </div>
</wa-dialog>