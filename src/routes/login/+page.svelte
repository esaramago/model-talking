<script lang="ts">
  import { enhance } from '$app/forms'
  import Grid from '@/components/ui/Grid.svelte'
  import { t } from '@/lib/i18n/index.svelte'
  import type { ActionData } from './$types'

  let { form }: { form: ActionData } = $props()
  let loading = $state(false)
</script>

<Grid direction="column" gap="l">
  <Grid direction="column" gap="xs">
    <h1 data-appearance="h2">{t('login.title')}</h1>
    <p>{t('login.subtitle')}</p>
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
        <Grid direction="column" gap="none">
          <label for="email">{t('login.emailLabel')}</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder={t('login.emailPlaceholder')}
            value={form?.email ?? ''}
            required
            autocomplete="email"
          />
        </Grid>
          
        <Grid direction="column" gap="none">
          <label for="password">{t('login.passwordLabel')}</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder={t('login.passwordPlaceholder')}
            required
            autocomplete="current-password"
          />
        </Grid>

        <wa-button type="submit" variant="brand" {loading}>
          {t('login.submit')}
        </wa-button>
      </Grid>
    </form>
  </wa-card>

  <p class="u-text-small">
    {t('login.noAccount')}
    <a href="/register">{t('login.registerLink')}</a>
  </p>
</Grid>
