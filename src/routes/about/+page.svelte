<script lang="ts">
  import { page } from '$app/state'
  import Grid from '@/components/ui/Grid.svelte'
  import Heading from '@/components/ui/Heading.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'
  import { DAILY_MESSAGE_LIMIT, PUBLIC_WEBSITE_TITLE } from '@/lib/config'
  import { stats } from '@/lib/state/stats.svelte'
  import { t } from '@/lib/i18n/index.svelte'

  const user = $derived(page.data?.user ?? null)

  const steps = $derived([
    {
      icon: 'users',
      title: t('about.step1Title'),
      text: t('about.step1Text')
    },
    {
      icon: 'comment-dots',
      title: t('about.step2Title'),
      text: t('about.step2Text')
    },
    {
      icon: 'comments',
      title: t('about.step3Title'),
      text: t('about.step3Text')
    }
  ])

  const features = $derived([
    {
      icon: 'user-pen',
      title: t('about.featurePersonasTitle'),
      text: t('about.featurePersonasText')
    },
    {
      icon: 'shuffle',
      title: t('about.featureRandomTitle'),
      text: t('about.featureRandomText')
    },
    {
      icon: 'sliders',
      title: t('about.featureSettingsTitle'),
      text: t('about.featureSettingsText')
    },
    {
      icon: 'clock-rotate-left',
      title: t('about.featureHistoryTitle'),
      text: t('about.featureHistoryText')
    }
  ])
</script>

<HeadMeta
  title={t('about.title', { title: PUBLIC_WEBSITE_TITLE })}
  description={t('about.subtitle')}
/>

<Grid direction="column" gap="3xl">
  <Heading
    title={t('about.title', { title: PUBLIC_WEBSITE_TITLE })}
    subtitle={t('about.subtitle')}
  />

  <wa-card>
    <Grid direction="column" gap="s">
      <h2>{t('about.whatItIsTitle', { title: PUBLIC_WEBSITE_TITLE })}</h2>
      <p>{t('about.whatItIsText1', { title: PUBLIC_WEBSITE_TITLE })}</p>
      <p>{t('about.whatItIsText2')}</p>
    </Grid>
  </wa-card>

  <Grid direction="column">
    <h2>{t('about.howItWorksTitle')}</h2>
    <Grid break="small" fullWidth>
      {#each steps as step}
        <wa-card>
          <Grid direction="column" gap="xs">
            <Grid align="center" gap="xs">
              <wa-icon name={step.icon} variant="solid"></wa-icon>
              <h3 data-appearance="h4">{step.title}</h3>
            </Grid>
            <p>{step.text}</p>
          </Grid>
        </wa-card>
      {/each}
    </Grid>
  </Grid>

  <Grid direction="column">
    <h2>{t('about.featuresTitle')}</h2>
    <Grid break="small" fullWidth>
      {#each features as feature}
        <wa-card>
          <Grid direction="column" gap="xs">
            <Grid align="center" gap="xs">
              <wa-icon name={feature.icon} variant="solid"></wa-icon>
              <h3 data-appearance="h4">{feature.title}</h3>
            </Grid>
            <p>{feature.text}</p>
          </Grid>
        </wa-card>
      {/each}
    </Grid>
  </Grid>

  <Grid break="small" fullWidth>
    <wa-card>
      <Grid direction="column" gap="s">
        <Grid align="center" gap="xs">
          <wa-icon name="cpu" variant="solid"></wa-icon>
          <h2>{t('about.modelTitle')}</h2>
        </Grid>
        <p>{t('about.modelText', { model: stats.model })}</p>
      </Grid>
    </wa-card>

    <wa-card>
      <Grid direction="column" gap="s">
        <Grid align="center" gap="xs">
          <wa-icon name="gauge-high" variant="solid"></wa-icon>
          <h2>{t('about.limitsTitle')}</h2>
        </Grid>
        <p>{t('about.limitsText', { dailyLimit: DAILY_MESSAGE_LIMIT })}</p>
      </Grid>
    </wa-card>

    <wa-card>
      <Grid direction="column" gap="s">
        <Grid align="center" gap="xs">
          <wa-icon name="shield-halved" variant="solid"></wa-icon>
          <h2>{t('about.accountTitle')}</h2>
        </Grid>
        <p>{t('about.accountText')}</p>
        {#if !user}
          <Grid>
            <wa-button href="/register" variant="brand">
              <wa-icon slot="start" name="user-plus" variant="solid"></wa-icon>
              {t('register.submit')}
            </wa-button>
          </Grid>
        {/if}
      </Grid>
    </wa-card>
  </Grid>
</Grid>