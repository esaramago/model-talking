<script lang="ts">
  import Chat from '@/components/Chat.svelte'
  import HeadMeta from '@/components/HeadMeta.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<HeadMeta
  title={data.talk?.title}
  description={data.talk?.initialTopic}
/>

<Chat talkId={data.talkId} initialTalk={data.talk} />
