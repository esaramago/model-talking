<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import Logo from './Logo.svelte'
  import { stats } from '@/lib/state/stats.svelte'
  import { sidebar } from '@/lib/state/sidebar.svelte'
</script>

<header>
  <Grid wrap={true} justify="space-between" align="center" gap="s">
    <Grid align="center" gap="s">
      <wa-button appearance="plain" onclick={() => sidebar.open()} class="is-hidden-desktop" pill>
        <wa-icon name="bars"></wa-icon>
      </wa-button>
      <div class="logo">
        <Logo />
      </div>
    </Grid>
    <wa-badge variant="brand">{stats.totalTokens} Tokens Total</wa-badge>
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
