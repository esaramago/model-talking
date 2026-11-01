<script lang="ts">
  import { enhance } from '$app/forms'
  import Grid from '@/components/ui/Grid.svelte'
  import type { ActionData } from './$types'

  let { form }: { form: ActionData } = $props()
  let loading = $state(false)
</script>

<Grid direction="column" gap="l">
  <Grid direction="column" gap="xs">
    <h1 data-appearance="h2">Iniciar Sessão</h1>
    <p>Introduz as tuas credenciais para acederes à tua conta.</p>
  </Grid>

  {#if form?.error}
    <wa-callout variant="danger">
      <wa-icon slot="start" name="triangle-exclamation" variant="solid"></wa-icon>
      {form.error}
    </wa-callout>
  {/if}

  <wa-card>
    <form
      method="POST"
      use:enhance={({ formElement, formData }) => {
        loading = true
        const inputs = formElement.querySelectorAll('wa-input')
        for (const input of inputs) {
          if (input.name && input.value !== undefined && input.value !== null && !formData.has(input.name)) {
            formData.append(input.name, String(input.value))
          }
        }
        return async ({ update }) => {
          loading = false
          await update()
        }
      }}
    >
      <Grid direction="column">
        <wa-input
          name="email"
          type="email"
          label="Email"
          placeholder="exemplo@dominio.com"
          value={form?.email ?? ''}
          required
          autocomplete="email"
        ></wa-input>

        <wa-input
          name="password"
          type="password"
          label="Palavra-passe"
          placeholder="A tua palavra-passe"
          required
          password-toggle
          autocomplete="current-password"
        ></wa-input>

        <wa-button type="submit" variant="brand" {loading}>
          Entrar
        </wa-button>
      </Grid>
    </form>
  </wa-card>

  <p class="u-text-small">
    Ainda não tens conta?
    <a href="/register">Regista-te aqui</a>
  </p>
</Grid>
