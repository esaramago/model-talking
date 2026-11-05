<script lang="ts">
  import Chat from '@/components/Chat.svelte'
  import Grid from '@/components/ui/Grid.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'
  import type { PageData } from './$types'
  import Heading from '@/components/ui/Heading.svelte'

  let { data }: { data: PageData } = $props()
</script>

<HeadMeta
  title={data.talk?.title}
  description={data.talk?.initialTopic}
/>

<Grid direction="column" gap="3xl" justify="stretch">
  <Heading title={data.talk?.title} />
  <Chat talkId={data.talkId} initialTalk={data.talk} />
</Grid>
