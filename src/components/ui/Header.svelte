<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import Logo from './Logo.svelte'
  import { stats } from '@/lib/state/stats.svelte'
  import { sidebar } from '@/lib/state/sidebar.svelte'
  import { t } from '@/lib/i18n/index.svelte'
</script>

<header>
  <Grid wrap={true} justify="space-between" align="center" gap="s">
    <Grid align="center" gap="s">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button role="button" tabindex="0" appearance="plain" onclick={() => sidebar.open()} class="is-hidden-desktop" pill>
        <wa-icon name="bars"></wa-icon>
      </wa-button>
      <div class="logo">
        <Logo />
      </div>
    </Grid>
    <Grid align="center" gap="s">
      <wa-badge variant="neutral">{t('header.model')}: {stats.model}</wa-badge>
      <wa-badge variant="neutral">
        {stats.generatedMessages} {stats.generatedMessages === 1 ? t('header.generatedMessageSingular') : t('header.generatedMessagePlural')}
      </wa-badge>
      <wa-badge variant="brand">{stats.totalTokens} {t('header.totalTokens')}</wa-badge>
    </Grid>
  </Grid>
</header>

<style>
  .logo {
    @media (min-width: 961px) {
      display: none;
    }
  }
  header {
    margin-block: var(--wa-space-l);
  }
</style>
