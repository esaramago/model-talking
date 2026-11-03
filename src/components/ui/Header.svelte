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
    <div class="header__stats">
      <Grid align="center" gap="s">
        <wa-badge variant="brand">{stats.totalTokens} {t('header.totalTokens')}</wa-badge>
        {#if stats.isUnlimited}
        <wa-badge variant="success">{t('header.dailyMessages')}: {t('header.unlimited')}</wa-badge>
        {:else}
        <wa-badge variant={stats.dailyRemaining === 0 ? 'danger' : 'neutral'}>
          {t('header.dailyMessages')}: {stats.dailyRemaining}/{stats.dailyTotal}
        </wa-badge>
        {/if}
      </Grid>
    </div>
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
  @media (min-width: 961px) {
    position: sticky;
    inset-block-start: var(--wa-space-s);
    z-index: 1;
  }
}
</style>
