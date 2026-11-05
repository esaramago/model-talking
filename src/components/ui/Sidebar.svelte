<script lang="ts">
import Grid from './Grid.svelte'
import Logo from './Logo.svelte'
import History from '@/components/History.svelte'
import { sidebar } from '@/lib/state/sidebar.svelte'
import { talksState } from '@/lib/state/talks.svelte'
import { page } from '$app/state'
import { t } from '@/lib/i18n/index.svelte'
import { PUBLIC_WEBSITE_TITLE } from '@/lib/config'

const user = $derived(page.data?.user ?? null)
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
    <History />
  </Grid>
  <Grid direction="column" gap="xs">
    {#if user}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button role="button" tabindex="0" size="s" href="/profile" variant="neutral" appearance="plain" onclick={() => sidebar.close()}>
        <wa-icon slot="start" name="user" variant="solid"></wa-icon>
        {t('sidebar.profile')}
      </wa-button>
    {/if}

    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <wa-button role="button" tabindex="0" size="s" href="/settings" variant="neutral" appearance="plain" onclick={() => sidebar.close()}>
      <wa-icon slot="start" name="gear" variant="solid"></wa-icon>
      {t('sidebar.settings')}
    </wa-button>
    
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <wa-button role="button" tabindex="0" size="s" href="/about" variant="neutral" appearance="plain" class="is-hidden-mobile" onclick={() => sidebar.close()}>
      <wa-icon slot="start" name="file-lines" variant="solid"></wa-icon>
      {t('header.about', { title: PUBLIC_WEBSITE_TITLE })}
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
  gap: var(--wa-space-xl);
  width: 28rem;
  padding: var(--wa-space-m) var(--wa-space-s);
  background-color: var(--wa-color-surface-lowered);
  overflow: auto;
  @media (max-width: 1024px) {
    position: fixed;
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