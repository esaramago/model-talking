<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import Grid from '@/components/ui/Grid.svelte'
  import Conversation from '@/components/Conversation.svelte'
  import MessageCard from '@/components/MessageCard.svelte'
  import Agents from '@/components/Agents.svelte'
  import Confirmation from '@/components/Confirmation.svelte'
  import { stats } from '@/lib/state/stats.svelte'
  import { talksState } from '@/lib/state/talks.svelte'
  import { pb } from '@/lib/pocketbase'
  import {
    requestModelTurn,
    generateTalkTitle,
    generateRandomScenario,
  } from '@/lib/chat'
  import {
    DEFAULT_AGENT_DRAFT,
    DEFAULT_SETTINGS,
    MAX_OUTPUT_TOKENS,
    MODEL,
    SCENARIO_THEMES,
    type ScenarioTheme,
  } from '@/lib/config'
  import {
    clearAgentDraft,
    loadAgentDraft,
    loadSettings,
    saveAgentDraft,
  } from '@/lib/storage'
  import { getRandomPersonaPair } from '@/lib/personas'
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
  let agent1Avatar = $state('/img/personas/1.svg')
  let agent2Avatar = $state('/img/personas/2.svg')
  let systemPrompt1 = $state(DEFAULT_AGENT_DRAFT.systemPrompt1)
  let systemPrompt2 = $state(DEFAULT_AGENT_DRAFT.systemPrompt2)
  let generalRules = $state(DEFAULT_SETTINGS.generalRules)
  let language = $state(DEFAULT_SETTINGS.language)
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
      agent1Avatar = '/img/personas/1.svg'
      agent2Avatar = '/img/personas/2.svg'
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

  function handleTopicInput(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement
    if (target.value.length > 200) {
      target.value = target.value.slice(0, 200)
    }
    initialTopic = target.value
  }

  function getSpeakerName(speaker: 'agent1' | 'agent2'): string {
    return speaker === 'agent1'
      ? agent1Name.trim() || t('agents.defaultAgent1')
      : agent2Name.trim() || t('agents.defaultAgent2')
  }

  async function handleRandomClick(theme: ScenarioTheme) {
    if (isRunning || isGeneratingRandom) return
    generatingTheme = theme
    randomErrorMessage = ''
    errorMessage = ''

    try {
      const result = await generateRandomScenario(language, theme)
      if (result.quota) {
        stats.setQuota(result.quota)
      }

      agent1Name = result.agent1Name
      agent2Name = result.agent2Name
      systemPrompt1 = result.systemPrompt1
      systemPrompt2 = result.systemPrompt2
      initialTopic = result.initialTopic

      const [randomAvatar1, randomAvatar2] = getRandomPersonaPair()
      agent1Avatar = randomAvatar1
      agent2Avatar = randomAvatar2
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
        avatar: targetSpeaker === 'agent1' ? agent1Avatar : agent2Avatar,
        timestamp: Date.now(),
      }

      messages = [...messages, newMessage]

      if (currentTalkId && (user?.id || pb.authStore.record?.id)) {
        try {
          const updated = await pb
            .collection('talks')
            .update<TalkRecord>(currentTalkId, {
              messages,
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
      if (!initialTopic.trim()) {
        errorMessage = t('chat.errorInitialTopic')
        return
      }

      errorMessage = ''
      randomErrorMessage = ''
      isRunning = true

      messages = []
      totalTokensUsed = 0

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
            messages,
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

    isRunning = true
    errorMessage = ''
    randomErrorMessage = ''
    await executeTurn()
    isRunning = false
  }
</script>

  <Grid direction="column" justify="center">
    <h3 data-appearance="h4" class="u-text-center">Preenche os campos abaixo ou escolhe um tema</h3>
    <Grid justify="center" wrap={true} gap="xs">
      {#each SCENARIO_THEMES as theme (theme.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <wa-button
          role="button"
          tabindex="0"
          variant="neutral"
          appearance="outlined"
          disabled={isRunning || isGeneratingRandom}
          loading={generatingTheme === theme.id || undefined}
          onclick={() => handleRandomClick(theme.id)}
        >
          <wa-icon slot="start" name={theme.icon} variant="solid"></wa-icon>
          {t(theme.labelKey)}
        </wa-button>
      {/each}
    </Grid>
  </Grid>

  {#if randomErrorMessage}
    <wa-callout variant="danger">
      <wa-icon slot="start" name="triangle-exclamation" variant="solid"></wa-icon>
      <Grid direction="column" gap="xs">
        <strong>{t('chat.error')}</strong>
        <p>{randomErrorMessage}</p>
      </Grid>
    </wa-callout>
  {/if}

  <Agents
    readonly={!!messages.length}
    bind:agent1Name
    bind:agent2Name
    bind:agent1Avatar
    bind:agent2Avatar
    bind:systemPrompt1
    bind:systemPrompt2
  />

  {#if conversationStarted}<Conversation {messages} {activeThinkingSpeaker} />

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
  {:else}
    <MessageCard
      speaker="agent1"
      speakerName={getSpeakerName('agent1')}
      avatar={agent1Avatar}
    >
      <wa-textarea
        maxlength="200"
        value={initialTopic}
        placeholder={t('chat.topicPlaceholder')}
        rows="1"
        oninput={handleTopicInput}
      ></wa-textarea>
    </MessageCard>

    {#if errorMessage}
      <wa-callout variant="danger">
        <wa-icon slot="start" name="triangle-exclamation" variant="solid"
        ></wa-icon>
        <Grid direction="column" gap="xs">
          <strong>{t('chat.error')}</strong>
          <p>{errorMessage}</p>
        </Grid>
      </wa-callout>
    {/if}

    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <Grid wrap={true} justify="end">
      <wa-button
        role="button"
        tabindex="0"
        variant="brand"
        disabled={isRunning}
        onclick={sendMessage}
      >
        <wa-icon slot="start" name="paper-plane" variant="solid"></wa-icon>
        {t('chat.start')}
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

<style>
  wa-textarea {
    &::part(textarea) {
      padding: var(--wa-space-l) var(--wa-space-xl);
      field-sizing: content;
      resize: none;
    }
    &::part(base) {
      border-radius: var(--wa-border-radius-s) var(--wa-border-radius-xl) var(--wa-border-radius-xl);
      background-color: var(--wa-color-brand-30);
      @media (prefers-color-scheme: light) {
        background-color: var(--wa-color-brand-80);
      }
    }
  }
</style>
