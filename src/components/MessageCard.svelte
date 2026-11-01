<script lang="ts">
  import Grid from '@/components/ui/Grid.svelte'
  import { t } from '@/lib/i18n/index.svelte'
  import type { ChatMessage } from '@/types/chat'

  let { message }: { message: ChatMessage } = $props()

  const reversed = $derived(message.speaker === 'llm1')
  const avatar = $derived(
    message.avatar || (message.speaker === 'llm1' ? '/img/personas/1.svg' : '/img/personas/2.svg')
  )
</script>

<div class={["chat-item", reversed ? 'chat-item--reversed' : '']}>
  {#if !reversed}
    <wa-avatar image={avatar}></wa-avatar>
  {/if}
  <wa-card>
    <Grid direction="column" gap="s">
      <Grid justify="space-between" align="center">
        <Grid align="center" gap="s">
          <wa-badge variant={message.speaker === 'llm1' ? 'brand' : 'success'}>
            {message.speakerName}
          </wa-badge>
        </Grid>

        {#if message.totalTokens}
          <wa-badge variant="neutral">{t('chat.tokens', { count: message.totalTokens })}</wa-badge>
        {/if}
      </Grid>

      <p>{message.content}</p>
    </Grid>
  </wa-card>
  {#if reversed}
    <wa-avatar image={avatar}></wa-avatar>
  {/if}
</div>

<style>
  .chat-item {
    --avatar-size: 7.3rem;
    display: grid;
    align-items: end;
    grid-template-columns: var(--avatar-size) 1fr;
    gap: var(--wa-space-m)
  }
  .chat-item--reversed {
    grid-template-columns: 1fr var(--avatar-size);
  }
  wa-avatar {
    --size: var(--avatar-size);
  }
  </style>