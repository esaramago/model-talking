<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import Heading from '@/components/ui/Heading.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'
  import { PUBLIC_WEBSITE_TITLE } from '@/lib/config'
  import { t } from '@/lib/i18n/index.svelte'

  const sections = $derived([
    {
      icon: 'shield-halved',
      title: t('privacy.controllerTitle'),
      text: t('privacy.controllerText', { title: PUBLIC_WEBSITE_TITLE })
    },
    {
      icon: 'database',
      title: t('privacy.dataCollectedTitle'),
      text: t('privacy.dataCollectedText')
    },
    {
      icon: 'microchip',
      title: t('privacy.aiProcessingTitle'),
      text: t('privacy.aiProcessingText')
    },
    {
      icon: 'cookie-bite',
      title: t('privacy.cookiesTitle'),
      text: t('privacy.cookiesText')
    },
    {
      icon: 'user-shield',
      title: t('privacy.rightsTitle'),
      text: t('privacy.rightsText')
    },
    {
      icon: 'clock-rotate-left',
      title: t('privacy.retentionTitle'),
      text: t('privacy.retentionText')
    }
  ])
</script>

<HeadMeta
  title={t('privacy.title')}
  description={t('privacy.subtitle')}
/>

<Grid direction="column" gap="3xl">
  <Heading
    title={t('privacy.title')}
    subtitle={t('privacy.subtitle')}
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
