<script lang="ts">
  import { enhance } from '$app/forms'
  import Grid from '@/components/ui/Grid.svelte'
  import { syncWebAwesomeFormData } from '@/lib/forms'
  import { t } from '@/lib/i18n/index.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'
  import type { ActionData } from './$types'
  import Heading from '@/components/ui/Heading.svelte'

  let { form }: { form: ActionData } = $props()
  let loading = $state(false)
</script>

<HeadMeta
  title={t('login.title')}
  description={t('login.subtitle')}
/>

<div class="l-container l-container--s">
  <Grid direction="column" gap="l">
    {#if form?.step === 'twoFactor'}
      <Heading title={t('login.twoFactorTitle')} subtitle={form?.twoFactorMethod === 'email' ? t('login.twoFactorSubtitleEmail') : t('login.twoFactorSubtitleAuth')} />

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
      <Heading title={t('login.title')} subtitle={t('login.subtitle')} />

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
            <wa-input
              name="email"
              type="email"
              label={t('login.emailLabel')}
              placeholder={t('login.emailPlaceholder')}
              value={form?.email ?? ''}
              required
              autocomplete="email"
            ></wa-input>

            <wa-input
              name="password"
              type="password"
              label={t('login.passwordLabel')}
              placeholder={t('login.passwordPlaceholder')}
              required
              password-toggle
              autocomplete="current-password"
            ></wa-input>

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
