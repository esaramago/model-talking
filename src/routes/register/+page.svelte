<script lang="ts">
  import { enhance } from '$app/forms'
  import Grid from '@/components/ui/Grid.svelte'
  import { syncWebAwesomeFormData } from '@/lib/forms'
  import { t } from '@/lib/i18n/index.svelte'
  import type { ActionData } from './$types'

  let { form }: { form: ActionData } = $props()
  let loading = $state(false)
</script>

<div class="l-container l-container--s">
  <Grid direction="column" gap="l">
    <Grid direction="column" gap="xs">
      <h1 data-appearance="h2">{t('register.title')}</h1>
      <p>{t('register.subtitle')}</p>
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
          syncWebAwesomeFormData(formElement, formData)
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
            label={t('register.nameLabel')}
            placeholder={t('register.namePlaceholder')}
            value={form?.name ?? ''}
            autocomplete="name"
          ></wa-input>

          <wa-input
            name="email"
            type="email"
            label={t('register.emailLabel')}
            placeholder={t('register.emailPlaceholder')}
            value={form?.email ?? ''}
            required
            autocomplete="email"
          ></wa-input>

          <wa-input
            name="password"
            type="password"
            label={t('register.passwordLabel')}
            placeholder={t('register.passwordPlaceholder')}
            required
            minlength={8}
            password-toggle
            autocomplete="new-password"
          ></wa-input>

          <wa-input
            name="passwordConfirm"
            type="password"
            label={t('register.confirmPasswordLabel')}
            placeholder={t('register.confirmPasswordPlaceholder')}
            required
            minlength={8}
            password-toggle
            autocomplete="new-password"
          ></wa-input>

          <wa-button type="submit" variant="brand" {loading}>
            {t('register.submit')}
          </wa-button>
        </Grid>
      </form>
    </wa-card>

    <p class="u-text-small">
      {t('register.hasAccount')}
      <a href="/login">{t('register.loginLink')}</a>
    </p>
  </Grid>
</div>
