<script lang="ts">
  import type { Snippet } from 'svelte'
  import { page } from '$app/state'
  import Grid from '@/components/ui/Grid.svelte'
  import { t } from '@/lib/i18n/index.svelte'
  import type { ChatMessage } from '@/types/chat'

  let {
    message,
    speaker = 'agent1',
    speakerName,
    avatar: customAvatar,
    children,
  }: {
    message?: ChatMessage
    speaker?: 'agent1' | 'agent2'
    speakerName?: string
    avatar?: string
    children?: Snippet
  } = $props()

  const currentSpeaker = $derived(message?.speaker ?? speaker)
  const currentSpeakerName = $derived(message?.speakerName ?? speakerName ?? '')
  const isAdmin = $derived(page.data?.user?.role === 'admin')
  const reversed = $derived(currentSpeaker === 'agent2')
  const avatar = $derived(
    message?.avatar ||
      customAvatar ||
      undefined
  )
</script>

<div class={["chat-item", reversed ? 'chat-item--reversed' : '']}>
  <Grid justify={reversed ? 'end' : 'start'} align="end" gap="s">
    <strong>{currentSpeakerName}</strong>
    <wa-avatar image={avatar}></wa-avatar>
    {#if isAdmin && message?.totalTokens}
      <wa-badge variant="neutral">{t('chat.tokens', { count: message.totalTokens })}</wa-badge>
    {/if}
  </Grid>
  {#if children}
    {@render children()}
  {:else}
    <wa-card>
      <p>{message?.content}</p>
    </wa-card>
  {/if}
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
    border-radius: var(--wa-border-radius-s) var(--wa-border-radius-xl) var(--wa-border-radius-xl);
    background-color: var(--wa-color-surface-lowered);
  }
  .chat-item--reversed {
    align-self: end;
    wa-card {
      border-radius: var(--wa-border-radius-xl) var(--wa-border-radius-s) var(--wa-border-radius-xl);
      background-color: var(--wa-color-secondary-30);
      @media (prefers-color-scheme: light) {
        background-color: var(--wa-color-secondary-80);
      }
    }
  }
  wa-avatar {
    --size: var(--avatar-size);
  }
  </style>