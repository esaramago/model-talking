<script lang="ts">
import Grid from './Grid.svelte'
import Logo from './Logo.svelte'
import { sidebar } from '@/lib/state/sidebar.svelte'
import { talksState } from '@/lib/state/talks.svelte'
import { page } from '$app/state'

const user = $derived(page.data?.user ?? null)
const talks = $derived(user ? (talksState.items.length > 0 ? talksState.items : (page.data?.talks ?? [])) : [])
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
      Nova conversa
    </wa-button>
    {#if user}
      <Grid direction="column" gap="s">
        <h2 data-appearance="h4">Conversas</h2>
        {#if talks.length === 0}
          <p class="u-text-small">Sem conversas ainda</p>
        {:else}
          <ul>
            {#each talks as talk (talk.id)}
              <li>
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                <a href="/talks/{talk.id}" onclick={() => sidebar.close()}>{talk.title}</a>
              </li>
            {/each}
          </ul>
        {/if}
      </Grid>
    {:else}
      <Grid align="center" gap="xs">
        <wa-icon name="circle-info"></wa-icon>
        <p class="u-text-small">
          <a href="/login" onclick={() => sidebar.close()}>Inicia a sessão</a> para guardar a atividade
        </p>
      </Grid>
    {/if}
  </Grid>
  <Grid direction="column" gap="s">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div>
      <wa-button role="button" tabindex="0" size="s" href="/settings" variant="neutral" appearance="plain" onclick={() => sidebar.close()}>
        <wa-icon slot="start" name="gear" variant="solid"></wa-icon>
        Definições
      </wa-button>
    </div>

    {#if user}
      <Grid justify="space-between" align="center" gap="s">
        <span class="u-text-small">{user.name || user.email}</span>
        <form method="POST" action="/logout">
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <wa-button role="button" tabindex="0" type="submit" variant="neutral" appearance="plain" size="small" onclick={() => sidebar.close()}>
            <wa-icon slot="start" name="arrow-right-from-bracket" variant="solid"></wa-icon>
            Sair
          </wa-button>
        </form>
      </Grid>
    {:else}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <wa-button role="button" tabindex="0" href="/login" variant="brand" appearance="outlined" onclick={() => sidebar.close()}>
        <wa-icon slot="start" name="arrow-right-to-bracket" variant="solid"></wa-icon>
        Iniciar sessão
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