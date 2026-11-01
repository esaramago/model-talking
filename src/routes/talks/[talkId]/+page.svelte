<script lang="ts">
  import Chat from '@/components/Chat.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<Chat talkId={data.talkId} initialTalk={data.talk} />
