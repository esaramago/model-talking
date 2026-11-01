<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import MessageCard from '@/components/MessageCard.svelte'
  import { t } from '@/lib/i18n/index.svelte'
  import type { ChatMessage } from '@/types/chat'

  let {
    messages = [],
    activeThinkingSpeaker = null
  }: {
    messages: ChatMessage[]
    activeThinkingSpeaker?: string | null
  } = $props()
</script>

<Grid direction="column" gap="l">
  {#each messages as msg (msg.id)}
    <MessageCard message={msg} />
  {/each}

  {#if activeThinkingSpeaker}
    <wa-card>
      <Grid align="center" gap="s">
        <wa-spinner></wa-spinner>
        <span>{t('chat.thinking', { speaker: activeThinkingSpeaker })}</span>
      </Grid>
    </wa-card>
  {/if}
</Grid>
