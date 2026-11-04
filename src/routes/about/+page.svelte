<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import Heading from '@/components/ui/Heading.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'
  import { PUBLIC_WEBSITE_TITLE } from '@/lib/config'
  import { t } from '@/lib/i18n/index.svelte'
</script>

<HeadMeta
  title={t('about.title', { title: PUBLIC_WEBSITE_TITLE })}
  description={t('about.subtitle')}
/>

<div class="l-container">
  <Grid direction="column" gap="l">
    <Heading
      title={t('about.title', { title: PUBLIC_WEBSITE_TITLE })}
      subtitle={t('about.subtitle')}
    />

  </Grid>
</div>
