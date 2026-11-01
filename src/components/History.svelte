<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import Confirmation from '@/components/Confirmation.svelte'
  import { sidebar } from '@/lib/state/sidebar.svelte'
  import { talksState } from '@/lib/state/talks.svelte'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { t } from '@/lib/i18n/index.svelte'
  import type { TalkRecord } from '@/types/chat'

  let {
    talks: propTalks,
    onitemclick
  }: {
    talks?: TalkRecord[]
    onitemclick?: () => void
  } = $props()

  const user = $derived(page.data?.user ?? null)
  const talks = $derived(
    propTalks ?? (user ? (talksState.items.length > 0 ? talksState.items : (page.data?.talks ?? [])) : [])
  )

  let talkToDelete = $state<TalkRecord | null>(null)
  let isConfirmDeleteOpen = $state(false)
  let isDeleting = $state(false)

  function handleItemClick() {
    sidebar.close()
    onitemclick?.()
  }

  function openDeleteConfirm(talk: TalkRecord) {
    talkToDelete = talk
    isConfirmDeleteOpen = true
  }

  async function handleDeleteTalk() {
    if (!talkToDelete) return

    const id = talkToDelete.id
    isDeleting = true
    try {
      await talksState.delete(id)
      isConfirmDeleteOpen = false

      if (page.params.talkId === id || page.url.pathname === `/talks/${id}`) {
        talksState.triggerNewChat()
        goto('/')
      }
      talkToDelete = null
    } catch (err) {
      console.error('Failed to delete talk:', err)
    } finally {
      isDeleting = false
    }
  }
</script>

{#if user}
  <Grid direction="column" gap="s">
    <h2 data-appearance="h4">{t('sidebar.conversations')}</h2>
    {#if talks.length === 0}
      <p class="u-text-small">{t('sidebar.noConversations')}</p>
    {:else}
      <ul class="history-navigation">
        {#each talks as talk (talk.id)}
          <li>
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <a href="/talks/{talk.id}" onclick={handleItemClick}>{talk.title}</a>
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <wa-button
              role="button"
              tabindex="0"
              variant="neutral"
              appearance="plain"
              size="xs"
              aria-label={t('sidebar.deleteConversation')}
              onclick={(e: MouseEvent) => {
                e.stopPropagation()
                openDeleteConfirm(talk)
              }}
            >
              <wa-icon name="times"></wa-icon>
            </wa-button>
          </li>
        {/each}
      </ul>
    {/if}
  </Grid>

  <Confirmation
    bind:open={isConfirmDeleteOpen}
    title={t('sidebar.deleteConfirmTitle')}
    message={t('sidebar.deleteConfirmMessage')}
    confirmText={t('sidebar.delete')}
    cancelText={t('sidebar.cancel')}
    confirmVariant="danger"
    loading={isDeleting}
    onconfirm={handleDeleteTalk}
    oncancel={() => {
      talkToDelete = null
    }}
  />
{:else}
  <Grid align="center" gap="xs">
    <wa-icon name="circle-info"></wa-icon>
    <p class="u-text-small">
      <a href="/login" onclick={handleItemClick}>{t('sidebar.loginToSavePrefix')}</a> {t('sidebar.loginToSaveSuffix')}
    </p>
  </Grid>
{/if}


<style>
.history-navigation {
  font-size: var(--wa-font-size-xs);
  @media (max-width: 960px) {
    font-size: var(--wa-font-size-s);
  }
  > li {
    display: flex;
    align-items: center;
    margin: 0;
  }
  a {
    flex: 1;
    padding: var(--wa-space-xs);
    margin-inline: calc(var(--wa-space-xs) * -1);
    text-decoration: none;
    line-height: 1.3;
    &:hover {
      background-color: var(--wa-color-surface-raised);
    }
  }
}
</style>