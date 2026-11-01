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
    buildMessagesForModel,
    requestModelTurn,
    generateTalkTitle
  } from '@/lib/chat'
  import {
    DEFAULT_SETTINGS,
    loadSettings,
    saveSettings
  } from '@/lib/storage'
  import {
    getRandomConversation,
    getRandomPersonaPair
  } from '@/lib/randomConversations'
  import { i18n, t } from '@/lib/i18n/index.svelte'
  import type { ChatMessage, TalkRecord } from '@/types/chat'

  let props: {
    talkId?: string
    initialTalk?: TalkRecord | null
  } = $props()

  const user = $derived(page.data?.user ?? null)

  let currentTalkId = $state('')
  let initialTopic = $state(DEFAULT_SETTINGS.initialTopic)
  let maxTokens = $state(DEFAULT_SETTINGS.maxTokens)

  let model = $state(DEFAULT_SETTINGS.model)
  let agent1Name = $state(DEFAULT_SETTINGS.agent1Name)
  let agent2Name = $state(DEFAULT_SETTINGS.agent2Name)
  let agent1Avatar = $state('/img/personas/1.svg')
  let agent2Avatar = $state('/img/personas/2.svg')
  let systemPrompt1 = $state(DEFAULT_SETTINGS.systemPrompt1)
  let systemPrompt2 = $state(DEFAULT_SETTINGS.systemPrompt2)
  let generalRules = $state(DEFAULT_SETTINGS.generalRules)
  let language = $state(DEFAULT_SETTINGS.language)

  let isHydrated = $state(false)

  let messages = $state<ChatMessage[]>([])
  let isRunning = $state(false)
  let statusMessage = $state(t('chat.ready'))
  let errorMessage = $state('')

  let totalPromptTokens = $state(0)
  let totalCompletionTokens = $state(0)
  let totalTokensUsed = $state(0)

  let activeThinkingSpeaker = $state<string | null>(null)
  let lastRandomId = $state<string | undefined>(undefined)
  let isConfirmRestartOpen = $state(false)

  function applyTalk(talk: TalkRecord) {
    currentTalkId = talk.id
    initialTopic = talk.initialTopic || ''
    messages = talk.messages || []
    const firstLlm1 = messages.find((m) => m.speaker === 'llm1' && m.avatar)
    if (firstLlm1?.avatar) agent1Avatar = firstLlm1.avatar
    const firstLlm2 = messages.find((m) => m.speaker === 'llm2' && m.avatar)
    if (firstLlm2?.avatar) agent2Avatar = firstLlm2.avatar
    if (talk.model) model = talk.model
    if (talk.agent1Name) agent1Name = talk.agent1Name
    if (talk.agent2Name) agent2Name = talk.agent2Name
    if (talk.systemPrompt1) systemPrompt1 = talk.systemPrompt1
    if (talk.systemPrompt2) systemPrompt2 = talk.systemPrompt2
    if (talk.generalRules) generalRules = talk.generalRules
    if (talk.language) language = talk.language
    if (talk.maxTokens) maxTokens = talk.maxTokens
    if (talk.totalTokens) totalTokensUsed = talk.totalTokens
    statusMessage = messages.length > 0 ? t('chat.conversationLoaded') : t('chat.ready')
  }

  function resetNewChat() {
    if (isRunning) return
    currentTalkId = ''
    messages = []
    totalPromptTokens = 0
    totalCompletionTokens = 0
    totalTokensUsed = 0
    randomizeAgents()
    statusMessage = t('chat.ready')
  }

  function promptRestart() {
    if (isRunning) return
    isConfirmRestartOpen = true
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
      systemPrompt2
    }

    if (props.talkId) {
      talksState.pendingRestartAgents = preservedAgents
      goto('/')
    } else {
      currentTalkId = ''
      messages = []
      totalPromptTokens = 0
      totalCompletionTokens = 0
      totalTokensUsed = 0
      initialTopic = ''
      statusMessage = t('chat.ready')
      errorMessage = ''
    }
  }

  onMount(() => {
    const loaded = loadSettings(user?.id, user?.settings)
    maxTokens = user ? loaded.maxTokens : DEFAULT_SETTINGS.maxTokens
    model = user ? loaded.model : DEFAULT_SETTINGS.model
    generalRules = user ? loaded.generalRules : DEFAULT_SETTINGS.generalRules
    language = loaded.language

    if (props.initialTalk) {
      applyTalk(props.initialTalk)
    } else if (talksState.pendingRestartAgents) {
      const p = talksState.pendingRestartAgents
      agent1Name = p.agent1Name
      agent2Name = p.agent2Name
      agent1Avatar = p.agent1Avatar
      agent2Avatar = p.agent2Avatar
      systemPrompt1 = p.systemPrompt1
      systemPrompt2 = p.systemPrompt2
      initialTopic = ''
      talksState.pendingRestartAgents = null
    } else {
      randomizeAgents()
    }

    isHydrated = true
  })

  $effect(() => {
    if (!user) {
      model = DEFAULT_SETTINGS.model
      maxTokens = DEFAULT_SETTINGS.maxTokens
      generalRules = DEFAULT_SETTINGS.generalRules
    }
  })

  let lastNewChatTrigger = $state(0)

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
      if (talksState.pendingRestartAgents) {
        const p = talksState.pendingRestartAgents
        currentTalkId = ''
        messages = []
        totalPromptTokens = 0
        totalCompletionTokens = 0
        totalTokensUsed = 0
        agent1Name = p.agent1Name
        agent2Name = p.agent2Name
        agent1Avatar = p.agent1Avatar
        agent2Avatar = p.agent2Avatar
        systemPrompt1 = p.systemPrompt1
        systemPrompt2 = p.systemPrompt2
        initialTopic = ''
        statusMessage = t('chat.ready')
        talksState.pendingRestartAgents = null
      } else {
        // Switched back to new chat
        resetNewChat()
      }
    }
  })

  $effect(() => {
    if (!props.talkId) {
      language = i18n.currentLanguage
    }
  })

  $effect(() => {
    if (!isHydrated) return

    saveSettings({
      initialTopic: currentTalkId ? loadSettings(user?.id, user?.settings).initialTopic : initialTopic,
      maxTokens: user ? maxTokens : DEFAULT_SETTINGS.maxTokens,
      model: user ? model : DEFAULT_SETTINGS.model,
      agent1Name,
      agent2Name,
      systemPrompt1,
      systemPrompt2,
      generalRules: user ? generalRules : DEFAULT_SETTINGS.generalRules,
      language
    }, user?.id)
  })

  $effect(() => {
    stats.currentTurn = messages.length
    stats.generatedMessages = messages.length
    stats.totalTokens = totalTokensUsed
    stats.promptTokens = totalPromptTokens
    stats.completionTokens = totalCompletionTokens
    stats.status = statusMessage
    stats.isRunning = isRunning
  })

  function handleTopicInput(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement
    if (target.value.length > 200) {
      target.value = target.value.slice(0, 200)
    }
    initialTopic = target.value
  }

  function getSpeakerName(speaker: 'llm1' | 'llm2'): string {
    return speaker === 'llm1'
      ? agent1Name.trim() || t('agents.defaultAgent1')
      : agent2Name.trim() || t('agents.defaultAgent2')
  }

  function randomizeAgents() {
    const conv = getRandomConversation(lastRandomId)
    lastRandomId = conv.id

    const [randomAvatar1, randomAvatar2] = getRandomPersonaPair()
    agent1Avatar = conv.agent1.avatar || randomAvatar1
    agent2Avatar = conv.agent2.avatar || randomAvatar2

    agent1Name = conv.agent1.name
    systemPrompt1 = conv.agent1.description
    agent2Name = conv.agent2.name
    systemPrompt2 = conv.agent2.description
    if (conv.agent1.prompts?.[0]) {
      initialTopic = conv.agent1.prompts[0]
    }
  }

  async function executeTurn(): Promise<boolean> {
    if (messages.length === 0) return false

    const lastMessage = messages[messages.length - 1]
    const targetSpeaker: 'llm1' | 'llm2' = lastMessage.speaker === 'llm1' ? 'llm2' : 'llm1'
    const speakerName = getSpeakerName(targetSpeaker)
    const currentModel = user ? model : DEFAULT_SETTINGS.model
    const currentSystemPrompt = targetSpeaker === 'llm1' ? systemPrompt1 : systemPrompt2
    const currentAgentName = targetSpeaker === 'llm1' ? agent1Name : agent2Name
    const currentGeneralRules = user ? generalRules : DEFAULT_SETTINGS.generalRules
    const currentMaxTokens = user ? maxTokens : DEFAULT_SETTINGS.maxTokens

    activeThinkingSpeaker = speakerName
    statusMessage = t('chat.thinking', { speaker: speakerName })
    errorMessage = ''

    try {
      const apiMessages = buildMessagesForModel(
        messages,
        targetSpeaker,
        currentSystemPrompt,
        currentGeneralRules,
        currentAgentName,
        language
      )

      const response = await requestModelTurn({
        model: currentModel,
        messages: apiMessages,
        maxTokens: currentMaxTokens
      })

      const turnNumber = messages.length + 1
      const pTokens = response.usage?.prompt_tokens ?? 0
      const cTokens = response.usage?.completion_tokens ?? 0
      const tTokens = response.usage?.total_tokens ?? 0

      totalPromptTokens += pTokens
      totalCompletionTokens += cTokens
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
        avatar: targetSpeaker === 'llm1' ? agent1Avatar : agent2Avatar,
        timestamp: Date.now()
      }

      messages = [...messages, newMessage]

      if (currentTalkId && (user?.id || pb.authStore.record?.id)) {
        try {
          const updated = await pb.collection('talks').update<TalkRecord>(currentTalkId, {
            messages,
            totalTokens: totalTokensUsed
          })
          talksState.addOrUpdate(updated)
        } catch (err) {
          console.error('Failed to update talk in PocketBase:', err)
        }
      }

      activeThinkingSpeaker = null
      statusMessage = t('chat.ready')
      return true
    } catch (err: unknown) {
      activeThinkingSpeaker = null
      errorMessage = err instanceof Error ? err.message : t('chat.errorTurn')
      statusMessage = t('chat.errorOccurred')
      return false
    }
  }

  async function sendMessage() {
    if (isRunning) return

    if (messages.length === 0) {
      if (!initialTopic.trim()) {
        errorMessage = t('chat.errorInitialTopic')
        return
      }

      errorMessage = ''
      isRunning = true

      messages = []
      totalPromptTokens = 0
      totalCompletionTokens = 0
      totalTokensUsed = 0

      const firstMessage: ChatMessage = {
        id: crypto.randomUUID(),
        speaker: 'llm1',
        speakerName: getSpeakerName('llm1'),
        model: user ? model : DEFAULT_SETTINGS.model,
        content: initialTopic.trim(),
        turn: 1,
        avatar: agent1Avatar,
        timestamp: Date.now()
      }

      messages = [firstMessage]

      const titleModel = user ? model : DEFAULT_SETTINGS.model
      const talkTitlePromise = generateTalkTitle(initialTopic, titleModel).catch(
        () => initialTopic.trim().slice(0, 30)
      )

      const turnSuccess = await executeTurn()
      if (!turnSuccess) {
        isRunning = false
        return
      }

      const currentUserId = user?.id || pb.authStore.record?.id
      if (currentUserId) {
        statusMessage = t('chat.savingConversation')
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
            model,
            maxTokens,
            totalTokens: totalTokensUsed,
            user: currentUserId
          })

          currentTalkId = newTalk.id
          talksState.addOrUpdate(newTalk)
          await goto(`/talks/${newTalk.id}`, { replaceState: true, keepFocus: true })
        } catch (err) {
          console.error('Failed to create talk in PocketBase:', err)
        }
      }

      statusMessage = t('chat.ready')
      isRunning = false
      return
    }

    isRunning = true
    errorMessage = ''
    await executeTurn()
    isRunning = false
  }
</script>

<Grid direction="column" gap="xl" justify="stretch">
  {#if errorMessage}
    <wa-callout variant="danger">
      <wa-icon slot="start" name="triangle-exclamation" variant="solid"></wa-icon>
      <Grid direction="column" gap="xs">
        <strong>{t('chat.error')}</strong>
        <p>{errorMessage}</p>
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
  
  {#if messages.length === 0}

    <div class="chat-item">
      <wa-avatar image={agent1Avatar}></wa-avatar>
      <wa-textarea
        maxlength="200"
        value={initialTopic}
        placeholder={t('chat.topicPlaceholder')}
        rows="1"
        oninput={handleTopicInput}
      ></wa-textarea>
    </div>

    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <Grid wrap={true} align="center" justify="end" gap="s">
      <wa-button
        role="button"
        tabindex="0"
        variant="neutral"
        appearance="outlined"
        disabled={isRunning}
        onclick={randomizeAgents}
      >
        <wa-icon slot="start" name="shuffle" variant="solid"></wa-icon>
        {t('chat.random')}
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
    <Conversation {messages} {activeThinkingSpeaker} />

    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <Grid wrap={true} align="center" justify="end" gap="s">
      <wa-button
        role="button"
        tabindex="0"
        variant="neutral"
        appearance="outlined"
        disabled={isRunning}
        onclick={promptRestart}
      >
        <wa-icon slot="start" name="arrow-rotate-left" variant="solid"></wa-icon>
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
</Grid>

<style>
.chat-item {
  --avatar-size: 7.3rem;
  display: grid;
  align-items: end;
  grid-template-columns: var(--avatar-size) 1fr;
  gap: var(--wa-space-m)
}
wa-textarea {
  &::part(textarea) {
    padding: var(--wa-space-l) var(--wa-space-xl);
    field-sizing: content;
    resize: none;
  }
  &::part(base) {
    border-radius: var(--wa-border-radius-xl);
    background-color: var(--wa-color-surface-lowered);
  }
}
wa-avatar {
  --size: var(--avatar-size);
}
</style>