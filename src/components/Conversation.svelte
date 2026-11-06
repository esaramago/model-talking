<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import MessageCard from '@/components/MessageCard.svelte'
  import { t } from '@/lib/i18n/index.svelte'
  import type { ChatMessage } from '@/types/chat'

  let {
    messages = [],
    activeThinkingSpeaker = null,
    agent1Avatar = '',
    agent2Avatar = ''
  }: {
    messages: ChatMessage[]
    activeThinkingSpeaker?: string | null
    agent1Avatar?: string
    agent2Avatar?: string
  } = $props()
</script>

<Grid direction="column" gap="l">
  {#each messages as msg (msg.id)}
    <MessageCard
      message={msg}
      avatar={msg.avatar || (msg.speaker === 'agent1' ? agent1Avatar : agent2Avatar)}
    />
  {/each}

  {#if activeThinkingSpeaker}
    <Grid align="center" gap="s">
      <wa-spinner></wa-spinner>
      <span>{t('chat.thinking', { speaker: activeThinkingSpeaker })}</span>
    </Grid>
  {/if}
</Grid>
