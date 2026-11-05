<script lang="ts">
  import Chat from '@/components/Chat.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'
  import Grid from '@/components/ui/Grid.svelte'
  import Heading from '@/components/ui/Heading.svelte'
  import { t } from '@/lib/i18n/index.svelte'
</script>

<HeadMeta
  description="Two AI agents discussing with each other. They are very firm in their views, but always cordial."
/>

<Grid direction="column" gap="3xl" justify="stretch">
  <Heading title={t('chat.title')} subtitle={t('chat.subtitle')} />
  <Chat />
</Grid>