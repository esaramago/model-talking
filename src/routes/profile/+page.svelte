<script lang="ts">
  import { enhance } from '$app/forms'
  import type { SubmitFunction } from '@sveltejs/kit'
  import Grid from '@/components/ui/Grid.svelte'
  import { syncWebAwesomeFormData } from '@/lib/forms'
  import { t } from '@/lib/i18n/index.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'
  import type { ActionData, PageData } from './$types'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let loadingAction = $state<string | null>(null)
  let selectedMethod = $state<'none' | 'email' | 'authenticator'>('none')

  $effect(() => {
    selectedMethod = (data.user?.twoFactorMethod as 'none' | 'email' | 'authenticator') || 'none'
  })

  function handleMethodChange(e: Event) {
    const target = e.target as HTMLElement & { value?: string }
    const currentTarget = e.currentTarget as HTMLElement & { value?: string }
    const val = (target?.value || currentTarget?.value) as 'none' | 'email' | 'authenticator' | undefined
    if (val) {
      selectedMethod = val
    }
  }

  function createEnhance(actionName: string): SubmitFunction {
    return ({ formElement, formData }) => {
      loadingAction = actionName
      syncWebAwesomeFormData(formElement, formData)
      return async ({ result, update }) => {
        loadingAction = null
        await update({
          reset:
            (actionName === 'updatePassword' || actionName === 'disable2FA') &&
            result.type === 'success'
        })
      }
    }
  }
</script>

<HeadMeta
  title={t('profile.title')}
  description={t('profile.subtitle')}
/>

{#snippet feedback(actionName: string)}
  {#if form?.action === actionName}
    {#if form.errorKey}
      <wa-callout variant="danger">
        <wa-icon slot="start" name="triangle-exclamation" variant="solid"></wa-icon>
        {t(form.errorKey)}
      </wa-callout>
    {:else if form.success && form.messageKey}
      <wa-callout variant="success">
        <wa-icon slot="start" name="circle-check" variant="solid"></wa-icon>
        {t(form.messageKey)}
      </wa-callout>
    {/if}
  {/if}
{/snippet}

<div class="l-container l-container--s">
  <Grid direction="column" gap="l">
    <Grid direction="column" gap="xs">
      <h1 data-appearance="h2">{t('profile.title')}</h1>
      <p>{t('profile.subtitle')}</p>
    </Grid>

    <wa-card>
      <form method="POST" action="?/updateName" use:enhance={createEnhance('updateName')}>
        <Grid direction="column" gap="s">
          <h2 data-appearance="h4">{t('profile.nameTitle')}</h2>
          {@render feedback('updateName')}
          <wa-input
            name="name"
            type="text"
            label={t('profile.nameLabel')}
            placeholder={t('profile.namePlaceholder')}
            value={form?.action === 'updateName' && form.name !== undefined ? form.name : (data.user?.name ?? '')}
            autocomplete="name"
          ></wa-input>
          <div>
            <wa-button type="submit" variant="brand" loading={loadingAction === 'updateName'}>
              {t('profile.saveName')}
            </wa-button>
          </div>
        </Grid>
      </form>
    </wa-card>

    <wa-card>
      <form method="POST" action="?/updateEmail" use:enhance={createEnhance('updateEmail')}>
        <Grid direction="column" gap="s">
          <h2 data-appearance="h4">{t('profile.emailTitle')}</h2>
          {@render feedback('updateEmail')}
          <wa-input
            name="email"
            type="email"
            label={t('profile.emailLabel')}
            placeholder={t('profile.emailPlaceholder')}
            hint={t('profile.emailHint')}
            value={form?.action === 'updateEmail' && form.email !== undefined ? form.email : (data.user?.email ?? '')}
            required
            autocomplete="email"
          ></wa-input>
          <div>
            <wa-button type="submit" variant="brand" loading={loadingAction === 'updateEmail'}>
              {t('profile.saveEmail')}
            </wa-button>
          </div>
        </Grid>
      </form>
    </wa-card>

    <wa-card>
      <form method="POST" action="?/updatePassword" use:enhance={createEnhance('updatePassword')}>
        <Grid direction="column" gap="s">
          <h2 data-appearance="h4">{t('profile.passwordTitle')}</h2>
          {@render feedback('updatePassword')}
          <wa-input
            name="oldPassword"
            type="password"
            label={t('profile.currentPasswordLabel')}
            placeholder={t('profile.currentPasswordPlaceholder')}
            required
            password-toggle
            autocomplete="current-password"
          ></wa-input>
          <wa-input
            name="password"
            type="password"
            label={t('profile.newPasswordLabel')}
            placeholder={t('profile.newPasswordPlaceholder')}
            required
            minlength={8}
            password-toggle
            autocomplete="new-password"
          ></wa-input>
          <wa-input
            name="passwordConfirm"
            type="password"
            label={t('profile.confirmPasswordLabel')}
            placeholder={t('profile.confirmPasswordPlaceholder')}
            required
            minlength={8}
            password-toggle
            autocomplete="new-password"
          ></wa-input>
          <div>
            <wa-button type="submit" variant="brand" loading={loadingAction === 'updatePassword'}>
              {t('profile.savePassword')}
            </wa-button>
          </div>
        </Grid>
      </form>
    </wa-card>

    <wa-card>
      <Grid direction="column" gap="s">
        <h2 data-appearance="h4">{t('profile.twoFactorTitle')}</h2>
        <p class="u-text-small">{t('profile.twoFactorHint')}</p>

        <Grid align="center" gap="s">
          <span class="u-text-small">{t('profile.twoFactorCurrentStatus')}</span>
          {#if (data.user?.twoFactorMethod || 'none') === 'none'}
            <wa-badge variant="neutral">{t('profile.twoFactorNone')}</wa-badge>
          {:else if data.user?.twoFactorMethod === 'email'}
            <wa-badge variant="success">{t('profile.twoFactorEmail')}</wa-badge>
          {:else}
            <wa-badge variant="brand">{t('profile.twoFactorAuthenticator')}</wa-badge>
          {/if}
        </Grid>

        {@render feedback('enableAuthenticator2FA')}
        {@render feedback('enableEmail2FA')}
        {@render feedback('sendEmail2FACode')}
        {@render feedback('disable2FA')}

        <wa-select
          label={t('profile.twoFactorLabel')}
          value={selectedMethod}
          onchange={handleMethodChange}
          oninput={handleMethodChange}
        >
          <wa-option value="none">{t('profile.twoFactorNone')}</wa-option>
          <wa-option value="authenticator">{t('profile.twoFactorAuthenticator')}</wa-option>
          <wa-option value="email">{t('profile.twoFactorEmail')}</wa-option>
        </wa-select>

        {#if selectedMethod === 'none' && (data.user?.twoFactorMethod || 'none') !== 'none'}
          <form method="POST" action="?/disable2FA" use:enhance={createEnhance('disable2FA')}>
            <Grid direction="column" gap="s">
              <wa-input
                name="currentPassword"
                type="password"
                label={t('profile.currentPasswordLabel')}
                placeholder={t('profile.currentPasswordPlaceholder')}
                required
                password-toggle
                autocomplete="current-password"
              ></wa-input>
              <div>
                <wa-button type="submit" variant="danger" appearance="outlined" loading={loadingAction === 'disable2FA'}>
                  <wa-icon slot="start" name="shield-halved"></wa-icon>
                  {t('profile.disable2FA')}
                </wa-button>
              </div>
            </Grid>
          </form>
        {:else if selectedMethod === 'authenticator' && data.user?.twoFactorMethod !== 'authenticator'}
          <Grid direction="column" gap="s">
            <h3 data-appearance="h5">{t('profile.setupAuthenticatorTitle')}</h3>
            <p class="u-text-small">{t('profile.setupAuthenticatorStep1')}</p>

            {#if data.authenticatorSetup?.otpAuthUri}
              <div class="u-text-center">
                <wa-qr-code value={data.authenticatorSetup.otpAuthUri} size="180"></wa-qr-code>
              </div>
            {/if}

            <p class="u-text-small">{t('profile.setupAuthenticatorStep2')}</p>
            {#if data.authenticatorSetup?.secret}
              <Grid align="center" gap="xs">
                <code>{data.authenticatorSetup.secret}</code>
              </Grid>
            {/if}

            <p class="u-text-small">{t('profile.setupAuthenticatorStep3')}</p>
            <form method="POST" action="?/enableAuthenticator2FA" use:enhance={createEnhance('enableAuthenticator2FA')}>
              <Grid direction="column" gap="s">
                <wa-input
                  name="code"
                  type="text"
                  label={t('profile.secretKeyLabel')}
                  placeholder="123456"
                  maxlength={6}
                  required
                  autocomplete="one-time-code"
                ></wa-input>
                <div>
                  <wa-button type="submit" variant="brand" loading={loadingAction === 'enableAuthenticator2FA'}>
                    {t('profile.verifyAndActivate')}
                  </wa-button>
                </div>
              </Grid>
            </form>
          </Grid>
        {:else if selectedMethod === 'email' && data.user?.twoFactorMethod !== 'email'}
          <Grid direction="column" gap="s">
            <form method="POST" action="?/sendEmail2FACode" use:enhance={createEnhance('sendEmail2FACode')}>
              <wa-button type="submit" variant="neutral" appearance="outlined" loading={loadingAction === 'sendEmail2FACode'}>
                <wa-icon slot="start" name="envelope"></wa-icon>
                {t('profile.sendTestEmailCode')}
              </wa-button>
            </form>

            <form method="POST" action="?/enableEmail2FA" use:enhance={createEnhance('enableEmail2FA')}>
              <Grid direction="column" gap="s">
                <wa-input
                  name="code"
                  type="text"
                  label={t('profile.emailCodeLabel')}
                  placeholder={t('profile.emailCodePlaceholder')}
                  maxlength={6}
                  required
                  autocomplete="one-time-code"
                ></wa-input>
                <div>
                  <wa-button type="submit" variant="brand" loading={loadingAction === 'enableEmail2FA'}>
                    {t('profile.verifyAndActivate')}
                  </wa-button>
                </div>
              </Grid>
            </form>
          </Grid>
        {/if}
      </Grid>
    </wa-card>
  </Grid>
</div>
