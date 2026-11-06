<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import Grid from '@/components/ui/Grid.svelte'
  import Conversation from '@/components/Conversation.svelte'
  import Agents from '@/components/Agents.svelte'
  import Confirmation from '@/components/Confirmation.svelte'
  import { stats } from '@/lib/state/stats.svelte'
  import { talksState } from '@/lib/state/talks.svelte'
  import { pb } from '@/lib/pocketbase'
  import {
    requestModelTurn,
    generateTalkTitle,
    generateAgentName,
    generateRandomScenario,
  } from '@/lib/chat'
  import {
    DEFAULT_AGENT_DRAFT,
    DEFAULT_SETTINGS,
    MAX_OUTPUT_TOKENS,
    MODEL,
    type ScenarioTheme,
  } from '@/lib/config'
  import {
    clearAgentDraft,
    loadAgentDraft,
    loadSettings,
    saveAgentDraft,
  } from '@/lib/storage'
  import { resizeAvatar, sanitizeMessagesForStorage } from '@/lib/avatar'
  import { trackUmamiEvent } from '@/lib/umami'
  import { i18n, t } from '@/lib/i18n/index.svelte'
  import type { ChatMessage, TalkRecord } from '@/types/chat'

  let props: {
    talkId?: string
    initialTalk?: TalkRecord | null
  } = $props()

  const user = $derived(page.data?.user ?? null)

  let currentTalkId = $state('')
  let initialTopic = $state(DEFAULT_AGENT_DRAFT.initialTopic)
  let maxTokens = $state(MAX_OUTPUT_TOKENS)

  let model = $state(MODEL)
  let agent1Name = $state(DEFAULT_AGENT_DRAFT.agent1Name)
  let agent2Name = $state(DEFAULT_AGENT_DRAFT.agent2Name)
  let agent1Avatar = $state('')
  let agent2Avatar = $state('')
  let systemPrompt1 = $state(DEFAULT_AGENT_DRAFT.systemPrompt1)
  let systemPrompt2 = $state(DEFAULT_AGENT_DRAFT.systemPrompt2)
  let generalRules = $state(DEFAULT_SETTINGS.generalRules)
  let language = $state<string>(i18n.currentLanguage)
  let maxChars = $state(DEFAULT_SETTINGS.maxChars)

  let isHydrated = $state(false)

  let messages = $state<ChatMessage[]>([])
  let isRunning = $state(false)
  let errorMessage = $state('')
  let randomErrorMessage = $state('')

  let totalTokensUsed = $state(0)

  let activeThinkingSpeaker = $state<string | null>(null)
  let generatingTheme = $state<ScenarioTheme | null>(null)
  let isGeneratingRandom = $derived(generatingTheme !== null)
  let isConfirmRestartOpen = $state(false)
  let isConfirmNewChatOpen = $state(false)

  function resetSessionCounters() {
    currentTalkId = ''
    messages = []
    model = MODEL
    maxTokens = MAX_OUTPUT_TOKENS
    totalTokensUsed = 0
    errorMessage = ''
    randomErrorMessage = ''
  }

  function applyPendingRestart(): boolean {
    const pending = talksState.pendingRestartAgents
    if (!pending) return false

    agent1Name = pending.agent1Name
    agent2Name = pending.agent2Name
    agent1Avatar = pending.agent1Avatar
    agent2Avatar = pending.agent2Avatar
    systemPrompt1 = pending.systemPrompt1
    systemPrompt2 = pending.systemPrompt2
    initialTopic = ''
    talksState.pendingRestartAgents = null
    return true
  }

  function applyTalk(talk: TalkRecord) {
    currentTalkId = talk.id
    initialTopic = talk.initialTopic || ''
    messages = talk.messages || []
    const firstAgent1 = messages.find((m) => m.speaker === 'agent1' && m.avatar)
    if (firstAgent1?.avatar) agent1Avatar = firstAgent1.avatar
    const firstAgent2 = messages.find((m) => m.speaker === 'agent2' && m.avatar)
    if (firstAgent2?.avatar) agent2Avatar = firstAgent2.avatar
    if (talk.model) model = talk.model
    if (talk.agent1Name) agent1Name = talk.agent1Name
    if (talk.agent2Name) agent2Name = talk.agent2Name
    if (talk.systemPrompt1) systemPrompt1 = talk.systemPrompt1
    if (talk.systemPrompt2) systemPrompt2 = talk.systemPrompt2
    if (talk.generalRules) generalRules = talk.generalRules
    if (talk.language) language = talk.language
    if (talk.maxChars) maxChars = talk.maxChars
    if (talk.maxTokens) maxTokens = Math.max(talk.maxTokens, MAX_OUTPUT_TOKENS)
    totalTokensUsed = talk.totalTokens ?? 0
  }

  function restoreDraft(): boolean {
    const draft = loadAgentDraft(user?.id)
    if (!draft) return false

    initialTopic = draft.initialTopic
    agent1Name = draft.agent1Name
    agent2Name = draft.agent2Name
    systemPrompt1 = draft.systemPrompt1
    systemPrompt2 = draft.systemPrompt2

    return true
  }

  function resetNewChat() {
    if (isRunning) return
    resetSessionCounters()
    const loaded = loadSettings(user?.id, user)
    maxChars = loaded.maxChars
    if (!restoreDraft()) {
      initialTopic = ''
      agent1Name = ''
      agent2Name = ''
      systemPrompt1 = ''
      systemPrompt2 = ''
      agent1Avatar = ''
      agent2Avatar = ''
    }
  }

  function promptRestart() {
    if (isRunning) return
    isConfirmRestartOpen = true
  }

  function promptNewChat() {
    if (isRunning) return
    isConfirmNewChatOpen = true
  }

  function handleNewChat() {
    if (isRunning) return
    isConfirmNewChatOpen = false

    if (props.talkId) {
      talksState.pendingRestartAgents = null
      goto('/')
    } else {
      resetNewChat()
    }
  }

  function handleRestart() {
    if (isRunning) return
    isConfirmRestartOpen = false

    const preservedAgents = {
      agent1Name,
      agent2Name,
      agent1Avatar,
      agent2Avatar,
      systemPrompt1,
      systemPrompt2,
    }

    if (props.talkId) {
      talksState.pendingRestartAgents = preservedAgents
      goto('/')
    } else {
      resetSessionCounters()
      initialTopic = ''
    }
  }

  onMount(() => {
    const loaded = loadSettings(user?.id, user)
    generalRules = loaded.generalRules
    language = loaded.language
    maxChars = loaded.maxChars

    if (props.initialTalk) {
      applyTalk(props.initialTalk)
    } else if (!applyPendingRestart()) {
      restoreDraft()
    }

    isHydrated = true
  })

  let lastNewChatTrigger = $state(talksState.newChatTrigger)

  $effect(() => {
    if (talksState.newChatTrigger > lastNewChatTrigger) {
      lastNewChatTrigger = talksState.newChatTrigger
      if (!props.talkId) {
        resetNewChat()
      }
    }
  })

  $effect(() => {
    if (props.initialTalk && props.initialTalk.id !== currentTalkId) {
      applyTalk(props.initialTalk)
    } else if (props.talkId && props.talkId !== currentTalkId) {
      currentTalkId = props.talkId
    } else if (!props.talkId && currentTalkId && !isRunning) {
      resetSessionCounters()
      if (!applyPendingRestart()) {
        // Switched back to new chat
        resetNewChat()
      }
    }
  })

  let conversationStarted = $derived(messages.length > 0)

  $effect(() => {
    if (!props.talkId) {
      language = i18n.currentLanguage
    }
  })

  $effect(() => {
    // Keep the agents the user is editing in localStorage until the
    // conversation is persisted in the database.
    if (!isHydrated || currentTalkId || props.talkId || props.initialTalk) return

    saveAgentDraft(
      {
        initialTopic,
        agent1Name,
        agent2Name,
        systemPrompt1,
        systemPrompt2,
      },
      user?.id,
    )
  })

  $effect(() => {
    stats.totalTokens = totalTokensUsed
    stats.model = model || MODEL
  })

  function getSpeakerName(speaker: 'agent1' | 'agent2'): string {
    return speaker === 'agent1'
      ? agent1Name.trim() || t('agents.defaultAgent1')
      : agent2Name.trim() || t('agents.defaultAgent2')
  }

  async function handleRandomClick(theme: ScenarioTheme) {
    if (isRunning || isGeneratingRandom) return
    trackUmamiEvent('Random Scenario', { theme })
    generatingTheme = theme
    randomErrorMessage = ''
    errorMessage = ''

    try {
      const result = await generateRandomScenario(language, theme)
      if (result.quota) {
        stats.setQuota(result.quota)
      }

      systemPrompt1 = result.systemPrompt1
      systemPrompt2 = result.systemPrompt2
      initialTopic = result.initialTopic
      agent1Name = ''
      agent2Name = ''
      agent1Avatar = ''
      agent2Avatar = ''
    } catch (err: unknown) {
      const errorWithQuota = err as { quota?: Parameters<typeof stats.setQuota>[0]; message?: string }
      if (errorWithQuota?.quota) {
        stats.setQuota(errorWithQuota.quota)
      }
      randomErrorMessage = err instanceof Error ? err.message : t('chat.errorOccurred')
    } finally {
      generatingTheme = null
    }
  }

  async function executeTurn(): Promise<boolean> {
    if (!conversationStarted) return false

    const lastMessage = messages[messages.length - 1]
    const targetSpeaker: 'agent1' | 'agent2' =
      lastMessage.speaker === 'agent1' ? 'agent2' : 'agent1'
    const speakerName = getSpeakerName(targetSpeaker)
    const currentModel = model || MODEL
    const currentSystemPrompt =
      targetSpeaker === 'agent1' ? systemPrompt1 : systemPrompt2
    const currentAgentName =
      targetSpeaker === 'agent1' ? agent1Name : agent2Name
    const currentGeneralRules = user
      ? generalRules
      : DEFAULT_SETTINGS.generalRules

    activeThinkingSpeaker = speakerName
    errorMessage = ''

    try {
      const response = await requestModelTurn({
        model: currentModel,
        messages,
        targetSpeaker,
        systemPrompt: currentSystemPrompt,
        generalRules: currentGeneralRules,
        agentName: currentAgentName,
        language,
        maxChars,
      })

      if (response.quota) {
        stats.setQuota(response.quota)
      }

      const turnNumber = messages.length + 1
      const pTokens = response.usage?.prompt_tokens ?? 0
      const cTokens = response.usage?.completion_tokens ?? 0
      const tTokens = response.usage?.total_tokens ?? 0

      totalTokensUsed += tTokens

      const isFirstTurnForSpeaker = !messages.some(
        (m) => m.speaker === targetSpeaker && m.avatar
      )
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        speaker: targetSpeaker,
        speakerName,
        model: response.model || currentModel,
        content: response.content || t('chat.noResponse'),
        turn: turnNumber,
        promptTokens: pTokens,
        completionTokens: cTokens,
        totalTokens: tTokens,
        avatar: isFirstTurnForSpeaker
          ? (targetSpeaker === 'agent1' ? agent1Avatar : agent2Avatar)
          : undefined,
        timestamp: Date.now(),
      }

      messages = [...messages, newMessage]

      if (currentTalkId && (user?.id || pb.authStore.record?.id)) {
        try {
          const updated = await pb
            .collection('talks')
            .update<TalkRecord>(currentTalkId, {
              messages: sanitizeMessagesForStorage(messages),
              totalTokens: totalTokensUsed,
            })
          talksState.addOrUpdate(updated)
        } catch (err) {
          console.error('Failed to update talk in PocketBase:', err)
        }
      }

      activeThinkingSpeaker = null
      return true
    } catch (err: unknown) {
      activeThinkingSpeaker = null
      errorMessage = err instanceof Error ? err.message : t('chat.errorTurn')
      return false
    }
  }

  async function sendMessage() {
    if (isRunning) return

    if (!conversationStarted) {
      trackUmamiEvent('Start Conversation')

      if (!initialTopic.trim()) {
        errorMessage = t('chat.errorInitialTopic')
        return
      }

      errorMessage = ''
      randomErrorMessage = ''
      isRunning = true

      messages = []
      totalTokensUsed = 0

      const avatarPromise =
        systemPrompt1.trim() && systemPrompt2.trim()
          ? fetch('/api/avatar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt1: systemPrompt1.trim(),
                prompt2: systemPrompt2.trim(),
              }),
            })
              .then(async (res) => (res.ok ? res.json() : null))
              .catch((err) => {
                console.error('Failed to generate agent avatars on start:', err)
                return null
              })
          : Promise.resolve(null)

      const namesPromise =
        !agent1Name.trim() || !agent2Name.trim()
          ? Promise.all([
              agent1Name.trim()
                ? Promise.resolve(agent1Name.trim())
                : generateAgentName(
                    systemPrompt1,
                    t('agents.defaultAgent1'),
                    language,
                    model || MODEL,
                  ),
              agent2Name.trim()
                ? Promise.resolve(agent2Name.trim())
                : generateAgentName(
                    systemPrompt2,
                    t('agents.defaultAgent2'),
                    language,
                    model || MODEL,
                  ),
            ])
          : Promise.resolve([agent1Name.trim(), agent2Name.trim()])

      const [resolvedNames, avatarData] = await Promise.all([
        namesPromise,
        avatarPromise,
      ])

      agent1Name = resolvedNames[0]
      agent2Name = resolvedNames[1]

      if (avatarData?.avatar1) agent1Avatar = await resizeAvatar(avatarData.avatar1)
      if (avatarData?.avatar2) agent2Avatar = await resizeAvatar(avatarData.avatar2)
      agent1Avatar = await resizeAvatar(agent1Avatar)
      agent2Avatar = await resizeAvatar(agent2Avatar)

      const firstMessage: ChatMessage = {
        id: crypto.randomUUID(),
        speaker: 'agent1',
        speakerName: getSpeakerName('agent1'),
        model: model || MODEL,
        content: initialTopic.trim(),
        turn: 1,
        avatar: agent1Avatar,
        timestamp: Date.now(),
      }

      messages = [firstMessage]

      const titleModel = model || MODEL
      const talkTitlePromise = generateTalkTitle(
        initialTopic,
        titleModel,
      ).catch(() => initialTopic.trim().slice(0, 30))

      const turnSuccess = await executeTurn()
      if (!turnSuccess) {
        isRunning = false
        return
      }

      const currentUserId = user?.id || pb.authStore.record?.id
      if (currentUserId) {
        try {
          const talkTitle = await talkTitlePromise
          const newTalk = await pb.collection('talks').create<TalkRecord>({
            title: talkTitle,
            initialTopic: initialTopic.trim(),
            messages: sanitizeMessagesForStorage(messages),
            agent1Name,
            agent2Name,
            systemPrompt1,
            systemPrompt2,
            generalRules,
            language,
            model: model || MODEL,
            maxTokens: maxTokens || MAX_OUTPUT_TOKENS,
            maxChars,
            totalTokens: totalTokensUsed,
            user: currentUserId,
          })

          clearAgentDraft(currentUserId)
          currentTalkId = newTalk.id
          talksState.addOrUpdate(newTalk)
          await goto(`/talks/${newTalk.id}`, {
            replaceState: true,
            keepFocus: true,
          })
        } catch (err) {
          console.error('Failed to create talk in PocketBase:', err)
        }
      }

      isRunning = false
      return
    }

    trackUmamiEvent('Send Message')
    isRunning = true
    errorMessage = ''
    randomErrorMessage = ''
    await executeTurn()
    isRunning = false
  }
</script>

<Agents
  readonly={conversationStarted}
  bind:agent1Name
  bind:agent2Name
  bind:agent1Avatar
  bind:agent2Avatar
  bind:systemPrompt1
  bind:systemPrompt2
  bind:initialTopic
  {isRunning}
  {generatingTheme}
  {randomErrorMessage}
  {errorMessage}
  onrandom={handleRandomClick}
  onstart={sendMessage}
/>

{#if conversationStarted}
  <Conversation
    {messages}
    {activeThinkingSpeaker}
    {agent1Avatar}
    {agent2Avatar}
  />

  {#if errorMessage}
    <wa-callout variant="danger">
      <wa-icon slot="start" name="triangle-exclamation" variant="solid"></wa-icon>
      <Grid direction="column" gap="xs">
        <strong>{t('chat.error')}</strong>
        <p>{errorMessage}</p>
      </Grid>
    </wa-callout>
  {/if}

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <Grid wrap={true} align="center" justify="end" gap="s">
    <wa-button
      role="button"
      tabindex="0"
      variant="neutral"
      appearance="outlined"
      disabled={isRunning}
      onclick={promptNewChat}
    >
      {t('sidebar.newChat')}
    </wa-button>

    <wa-button
      role="button"
      tabindex="0"
      variant="neutral"
      appearance="outlined"
      disabled={isRunning}
      onclick={promptRestart}
    >
      <wa-icon slot="start" name="arrow-rotate-left" variant="solid"
      ></wa-icon>
      {t('chat.restart')}
    </wa-button>

    <wa-button
      role="button"
      tabindex="0"
      variant="brand"
      disabled={isRunning}
      onclick={sendMessage}
    >
      <wa-icon slot="start" name="paper-plane" variant="solid"></wa-icon>
      {t('chat.sendMessage')}
    </wa-button>
  </Grid>
{/if}

<Confirmation
  bind:open={isConfirmRestartOpen}
  title={t('chat.restartConfirmTitle')}
  message={t('chat.restartConfirmMessage')}
  confirmText={t('chat.restartConfirmButton')}
  cancelText={t('chat.restartCancelButton')}
  onconfirm={handleRestart}
/>

<Confirmation
  bind:open={isConfirmNewChatOpen}
  title={t('chat.newChatConfirmTitle')}
  message={t('chat.newChatConfirmMessage')}
  confirmText={t('chat.newChatConfirmButton')}
  cancelText={t('chat.newChatCancelButton')}
  onconfirm={handleNewChat}
/>
