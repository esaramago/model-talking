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
    {#if form?.step === 'twoFactor'}
      <Grid direction="column" gap="xs">
        <h1 data-appearance="h2">{t('login.twoFactorTitle')}</h1>
        <p>
          {#if form.twoFactorMethod === 'email'}
            {t('login.twoFactorSubtitleEmail')}
          {:else}
            {t('login.twoFactorSubtitleAuth')}
          {/if}
        </p>
      </Grid>

      {#if form?.errorKey}
        <wa-callout variant="danger">
          <wa-icon slot="start" name="triangle-exclamation" variant="solid"></wa-icon>
          {t(form.errorKey)}
        </wa-callout>
      {/if}

      <wa-card>
        <form
          method="POST"
          action="?/verifyTwoFactor"
          use:enhance={({ formElement, formData }) => {
            loading = true
            syncWebAwesomeFormData(formElement, formData)
            return async ({ update }) => {
              loading = false
              await update()
            }
          }}
        >
          <input type="hidden" name="pendingToken" value={form.pendingToken ?? ''} />
          <Grid direction="column">
            <wa-input
              name="code"
              type="text"
              label={t('login.twoFactorCodeLabel')}
              placeholder={t('login.twoFactorCodePlaceholder')}
              maxlength={6}
              required
              autocomplete="one-time-code"
            ></wa-input>

            <wa-button type="submit" variant="brand" {loading}>
              {t('login.verifyButton')}
            </wa-button>
          </Grid>
        </form>
      </wa-card>

      <form method="POST" action="?/cancelTwoFactor">
        <wa-button type="submit" variant="neutral" appearance="plain" size="s">
          <wa-icon slot="start" name="arrow-left"></wa-icon>
          {t('login.backToLogin')}
        </wa-button>
      </form>
    {:else}
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
          action="?/login"
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
    {/if}
  </Grid>
</div>
