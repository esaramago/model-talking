<script lang="ts">
  import { page } from '$app/state'
  import Grid from '@/components/ui/Grid.svelte'
  import { t } from '@/lib/i18n/index.svelte'
  import type { ChatMessage } from '@/types/chat'

  let { message }: { message: ChatMessage } = $props()

  const isAdmin = $derived(page.data?.user?.role === 'admin')
  const reversed = $derived(message.speaker === 'agent2')
  const avatar = $derived(
    message.avatar || (message.speaker === 'agent1' ? '/img/personas/1.svg' : '/img/personas/2.svg')
  )
</script>

<div class={["chat-item", reversed ? 'chat-item--reversed' : '']}>
  <Grid justify={reversed ? 'end' : 'start'} align="end" gap="s">
    <strong>{message.speakerName}</strong>
    <wa-avatar image={avatar}></wa-avatar>
    {#if isAdmin && message.totalTokens}
      <wa-badge variant="neutral">{t('chat.tokens', { count: message.totalTokens })}</wa-badge>
    {/if}
  </Grid>
  <wa-card>
    <p>{message.content}</p>
  </wa-card>
</div>

<style>
  .chat-item {
    --avatar-size: 3rem;
    display: flex;
    flex-direction: column;
    gap: var(--wa-space-xs);
    max-width: 70%;
    @media (max-width: 650px) {
      max-width: 90%;
    }
  }
  wa-card {
    background-color: var(--wa-color-brand-30);
    @media (prefers-color-scheme: light) {
      background-color: var(--wa-color-brand-80);
    }
  }
  .chat-item--reversed {
    align-self: end;
    wa-card {
      background-color: var(--wa-color-surface-lowered);
    }
  }
  wa-avatar {
    --size: var(--avatar-size);
  }
  </style>