<script lang="ts">
  import { enhance } from '$app/forms'
  import Grid from '@/components/ui/Grid.svelte'
  import { syncWebAwesomeFormData } from '@/lib/forms'
  import { t } from '@/lib/i18n/index.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'
  import Heading from '@/components/ui/Heading.svelte'
  import type { ActionData } from './$types'

  let { form }: { form: ActionData } = $props()
  let loading = $state(false)
</script>

<HeadMeta
  title={t('register.title')}
  description={t('register.subtitle')}
/>

<div class="l-container l-container--s">
  <Grid direction="column" gap="l">
    <Heading title={t('register.title')} subtitle={t('register.subtitle')} />

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
        <!-- Use native HTML inputs instead of wa-input for password manager compatibility -->
        <Grid direction="column">
          <Grid direction="column" gap="none">
            <label for="email">{t('register.emailLabel')}</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder={t('register.emailPlaceholder')}
              value={form?.email ?? ''}
              required
              autocomplete="email"
            />
          </Grid>

          <Grid direction="column" gap="none">
            <label for="password">{t('register.passwordLabel')}</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={t('register.passwordPlaceholder')}
              required
              minlength={8}
              autocomplete="new-password"
            />
          </Grid>

          <Grid direction="column" gap="none">
            <label for="passwordConfirm">{t('register.confirmPasswordLabel')}</label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              placeholder={t('register.confirmPasswordPlaceholder')}
              required
              minlength={8}
              autocomplete="new-password"
            />
          </Grid>

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
