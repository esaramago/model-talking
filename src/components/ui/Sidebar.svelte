<script lang="ts">
import Grid from './Grid.svelte'
import Logo from './Logo.svelte'
import Confirmation from '@/components/Confirmation.svelte'
import { sidebar } from '@/lib/state/sidebar.svelte'
import { talksState } from '@/lib/state/talks.svelte'
import { page } from '$app/state'
import { goto } from '$app/navigation'
import { t } from '@/lib/i18n/index.svelte'
import type { TalkRecord } from '@/types/chat'

const user = $derived(page.data?.user ?? null)
const talks = $derived(user ? (talksState.items.length > 0 ? talksState.items : (page.data?.talks ?? [])) : [])

let talkToDelete = $state<TalkRecord | null>(null)
let isConfirmDeleteOpen = $state(false)
let isDeleting = $state(false)

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

<aside class={sidebar.isOpen ? 'is-open' : '' }>
  <Grid direction="column" gap="xl">
    <Grid tag="header" justify="space-between">
      <Logo />
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button role="button" tabindex="0" appearance="plain" onclick={() => sidebar.close()} class="is-hidden-desktop" pill>
        <wa-icon name="times"></wa-icon>
      </wa-button>
    </Grid>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <wa-button
      role="button"
      tabindex="0"
      href="/"
      variant="brand"
      onclick={() => {
        sidebar.close()
        talksState.triggerNewChat()
      }}
    >
      {t('sidebar.newChat')}
    </wa-button>
    {#if user}
      <Grid direction="column" gap="s">
        <h2 data-appearance="h4">{t('sidebar.conversations')}</h2>
        {#if talks.length === 0}
          <p class="u-text-small">{t('sidebar.noConversations')}</p>
        {:else}
          <ul>
            {#each talks as talk (talk.id)}
              <Grid tag="li" justify="space-between" align="center" gap="xs">
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <a href="/talks/{talk.id}" onclick={() => sidebar.close()}>{talk.title}</a>
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <wa-button
                  role="button"
                  tabindex="0"
                  variant="neutral"
                  appearance="plain"
                  size="s"
                  aria-label={t('sidebar.deleteConversation')}
                  onclick={(e: MouseEvent) => {
                    e.stopPropagation()
                    openDeleteConfirm(talk)
                  }}
                >
                  <wa-icon name="times"></wa-icon>
                </wa-button>
              </Grid>
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
          <a href="/login" onclick={() => sidebar.close()}>{t('sidebar.loginToSavePrefix')}</a> {t('sidebar.loginToSaveSuffix')}
        </p>
      </Grid>
    {/if}
  </Grid>
  <Grid direction="column" gap="s">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <wa-button role="button" tabindex="0" size="s" href="/settings" variant="neutral" appearance="plain" onclick={() => sidebar.close()}>
      <wa-icon slot="start" name="gear" variant="solid"></wa-icon>
      {t('sidebar.settings')}
    </wa-button>

    {#if user}
      <Grid justify="space-between" align="center" gap="s">
        <span class="u-text-small">{user.name || user.email}</span>
        <form method="POST" action="/logout">
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <wa-button role="button" tabindex="0" type="submit" variant="neutral" appearance="plain" size="s" onclick={() => sidebar.close()}>
            <wa-icon slot="start" name="arrow-right-from-bracket" variant="solid"></wa-icon>
            {t('sidebar.logout')}
          </wa-button>
        </form>
      </Grid>
    {:else}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button role="button" tabindex="0" href="/login" variant="brand" appearance="outlined" onclick={() => sidebar.close()}>
        <wa-icon slot="start" name="arrow-right-to-bracket" variant="solid"></wa-icon>
        {t('sidebar.login')}
      </wa-button>
    {/if}
  </Grid>
</aside>

<style>
aside {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 28rem;
  padding: var(--wa-space-m) var(--wa-space-s);
  background-color: var(--wa-color-surface-lowered);
  overflow: auto;
  @media (max-width: 960px) {
    position: absolute;
    height: 100%;
    z-index: 2;
    transform: translateX(-100%);
    transition: transform .4s;

    &.is-open {
      transform: translateX(0);
    }
  }
}
</style>