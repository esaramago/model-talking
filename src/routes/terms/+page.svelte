<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import Heading from '@/components/ui/Heading.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'
  import { PUBLIC_WEBSITE_TITLE } from '@/lib/config'
  import { t } from '@/lib/i18n/index.svelte'

  const sections = $derived([
    {
      icon: 'file-contract',
      title: t('terms.acceptanceTitle'),
      text: t('terms.acceptanceText', { title: PUBLIC_WEBSITE_TITLE })
    },
    {
      icon: 'triangle-exclamation',
      title: t('terms.aiDisclaimerTitle'),
      text: t('terms.aiDisclaimerText')
    },
    {
      icon: 'ban',
      title: t('terms.acceptableUseTitle'),
      text: t('terms.acceptableUseText')
    },
    {
      icon: 'users',
      title: t('terms.accountsTitle'),
      text: t('terms.accountsText')
    },
    {
      icon: 'copyright',
      title: t('terms.ipTitle'),
      text: t('terms.ipText', { title: PUBLIC_WEBSITE_TITLE })
    },
    {
      icon: 'clock-rotate-left',
      title: t('terms.changesTitle'),
      text: t('terms.changesText')
    }
  ])
</script>

<HeadMeta
  title={t('terms.title')}
  description={t('terms.subtitle', { title: PUBLIC_WEBSITE_TITLE })}
/>

<Grid direction="column" gap="3xl">
  <Heading
    title={t('terms.title')}
    subtitle={t('terms.subtitle', { title: PUBLIC_WEBSITE_TITLE })}
  />

  <Grid direction="column">
    {#each sections as section}
      <wa-card>
        <Grid direction="column" gap="s">
          <Grid align="center" gap="xs">
            <wa-icon name={section.icon} variant="solid"></wa-icon>
            <h2 data-appearance="h4">{section.title}</h2>
          </Grid>
          <p>{section.text}</p>
        </Grid>
      </wa-card>
    {/each}
  </Grid>
</Grid>
