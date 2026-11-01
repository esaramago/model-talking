<script lang="ts">
  import { enhance } from '$app/forms'
  import Grid from '@/components/ui/Grid.svelte'
  import type { ActionData } from './$types'

  let { form }: { form: ActionData } = $props()
  let loading = $state(false)
</script>

<Grid direction="column" gap="l">
  <Grid direction="column" gap="xs">
    <h1 data-appearance="h2">Criar Conta</h1>
    <p>Regista-te para guardares e acederes às tuas conversas.</p>
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
          name="name"
          type="text"
          label="Nome"
          placeholder="O teu nome (opcional)"
          value={form?.name ?? ''}
          autocomplete="name"
        ></wa-input>

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
          placeholder="Mínimo de 8 caracteres"
          required
          minlength={8}
          password-toggle
          autocomplete="new-password"
        ></wa-input>

        <wa-input
          name="passwordConfirm"
          type="password"
          label="Confirmar Palavra-passe"
          placeholder="Repete a palavra-passe"
          required
          minlength={8}
          password-toggle
          autocomplete="new-password"
        ></wa-input>

        <wa-button type="submit" variant="brand" {loading}>
          Criar Conta
        </wa-button>
      </Grid>
    </form>
  </wa-card>

  <p class="u-text-small">
    Já tens conta?
    <a href="/login">Inicia sessão aqui</a>
  </p>
</Grid>
