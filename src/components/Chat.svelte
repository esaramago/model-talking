<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import Grid from '@/components/ui/Grid.svelte'
  import Conversation from '@/components/Conversation.svelte'
  import Agents from '@/components/Agents.svelte'
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
    buildRandomChatMessages,
    getRandomPersonaPair,
    setActiveRandomTalk,
    getActiveRandomTalk
  } from '@/lib/randomConversations'
  import type { ChatMessage, TalkRecord } from '@/types/chat'

  let props: {
    talkId?: string
    initialTalk?: TalkRecord | null
  } = $props()

  const user = $derived(page.data?.user ?? null)

  let currentTalkId = $state('')
  let initialTopic = $state(DEFAULT_SETTINGS.initialTopic)
  let maxTurns = $state(DEFAULT_SETTINGS.maxTurns)
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
  let currentMaxTurns = $state(DEFAULT_SETTINGS.maxTurns)

  let messages = $state<ChatMessage[]>([])
  let isRunning = $state(false)
  let shouldStop = $state(false)
  let statusMessage = $state('Pronto')
  let errorMessage = $state('')

  let totalPromptTokens = $state(0)
  let totalCompletionTokens = $state(0)
  let totalTokensUsed = $state(0)

  let activeThinkingSpeaker = $state<string | null>(null)

  let isRandomMode = $state(false)
  let randomScriptMessages = $state<ChatMessage[] | null>(null)
  let lastRandomId = $state<string | undefined>(undefined)

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
    if (talk.maxTurns) {
      maxTurns = talk.maxTurns
      currentMaxTurns = Math.max(talk.maxTurns, messages.length)
    }
    if (talk.maxTokens) maxTokens = talk.maxTokens
    if (talk.totalTokens) totalTokensUsed = talk.totalTokens
    statusMessage = messages.length > 0 ? 'Conversa carregada.' : 'Pronto'
  }

  if (props.initialTalk) {
    applyTalk(props.initialTalk)
  }

  onMount(() => {
    const loaded = loadSettings(user?.id, user?.settings)
    maxTurns = loaded.maxTurns
    currentMaxTurns = loaded.maxTurns
    maxTokens = loaded.maxTokens
    model = loaded.model
    agent1Name = loaded.agent1Name
    agent2Name = loaded.agent2Name
    systemPrompt1 = loaded.systemPrompt1
    systemPrompt2 = loaded.systemPrompt2
    generalRules = loaded.generalRules
    language = loaded.language

    if (props.initialTalk) {
      applyTalk(props.initialTalk)
    } else {
      initialTopic = loaded.initialTopic
    }

    const activeRandom = getActiveRandomTalk()
    if (activeRandom && (!currentTalkId || activeRandom.talkId === currentTalkId)) {
      isRandomMode = true
      randomScriptMessages = activeRandom.messages
    }

    isHydrated = true
  })

  $effect(() => {
    if (props.initialTalk && props.initialTalk.id !== currentTalkId) {
      applyTalk(props.initialTalk)
    } else if (props.talkId && props.talkId !== currentTalkId) {
      currentTalkId = props.talkId
    } else if (!props.talkId && currentTalkId && !isRunning) {
      // Switched back to new chat
      currentTalkId = ''
      messages = []
      totalPromptTokens = 0
      totalCompletionTokens = 0
      totalTokensUsed = 0
      isRandomMode = false
      randomScriptMessages = null
      setActiveRandomTalk(null)
      agent1Avatar = '/img/personas/1.svg'
      agent2Avatar = '/img/personas/2.svg'
      const loaded = loadSettings(user?.id, user?.settings)
      initialTopic = loaded.initialTopic
      language = loaded.language
      statusMessage = 'Pronto'
    }
  })

  $effect(() => {
    if (!isHydrated) return

    saveSettings({
      initialTopic: currentTalkId ? loadSettings(user?.id, user?.settings).initialTopic : initialTopic,
      maxTurns,
      maxTokens,
      model,
      agent1Name,
      agent2Name,
      systemPrompt1,
      systemPrompt2,
      generalRules,
      language
    }, user?.id)
  })

  $effect(() => {
    stats.currentTurn = messages.length
    stats.maxTurns = currentMaxTurns
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
      ? agent1Name.trim() || 'Agente 1'
      : agent2Name.trim() || 'Agente 2'
  }

  async function executeTurn(): Promise<boolean> {
    if (messages.length === 0) {
      if (!initialTopic.trim()) {
        errorMessage = 'Por favor introduz um tópico inicial para o LLM 1.'
        return false
      }

      const firstMessage: ChatMessage = {
        id: crypto.randomUUID(),
        speaker: 'llm1',
        speakerName: getSpeakerName('llm1'),
        model,
        content: initialTopic.trim(),
        turn: 1,
        timestamp: Date.now()
      }

      messages = [...messages, firstMessage]
    }

    if (messages.length >= currentMaxTurns) {
      statusMessage = `Limite de ${currentMaxTurns} turnos atingido.`
      return false
    }

    const lastMessage = messages[messages.length - 1]
    const targetSpeaker: 'llm1' | 'llm2' = lastMessage.speaker === 'llm1' ? 'llm2' : 'llm1'
    const speakerName = getSpeakerName(targetSpeaker)
    const currentModel = model
    const currentSystemPrompt = targetSpeaker === 'llm1' ? systemPrompt1 : systemPrompt2
    const currentAgentName = targetSpeaker === 'llm1' ? agent1Name : agent2Name

    activeThinkingSpeaker = speakerName
    statusMessage = `${speakerName} a pensar...`
    errorMessage = ''

    try {
      const apiMessages = buildMessagesForModel(
        messages,
        targetSpeaker,
        currentSystemPrompt,
        generalRules,
        currentAgentName,
        language
      )

      const response = await requestModelTurn({
        model: currentModel,
        messages: apiMessages,
        maxTokens
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
        content: response.content || '(Sem resposta)',
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

      if (messages.length >= currentMaxTurns) {
        activeThinkingSpeaker = null
        statusMessage = `Concluído: limite de ${currentMaxTurns} turnos atingido.`
        return false
      } else {
        const nextSpeaker: 'llm1' | 'llm2' = targetSpeaker === 'llm1' ? 'llm2' : 'llm1'
        const nextSpeakerName = getSpeakerName(nextSpeaker)
        activeThinkingSpeaker = nextSpeakerName
        statusMessage = `${nextSpeakerName} a pensar...`
        return true
      }
    } catch (err: unknown) {
      activeThinkingSpeaker = null
      errorMessage = err instanceof Error ? err.message : 'Erro ao processar turno'
      statusMessage = 'Ocorreu um erro.'
      return false
    }
  }

  const TURN_DELAY_SECONDS = 5

  async function waitWithCountdown(seconds: number): Promise<boolean> {
    for (let remaining = seconds; remaining > 0; remaining--) {
      if (shouldStop) return false
      for (let i = 0; i < 10; i++) {
        if (shouldStop) return false
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
    return !shouldStop
  }

  async function runDialogueLoop() {
    while (!shouldStop && messages.length < currentMaxTurns) {
      const canProceed = await executeTurn()
      if (!canProceed) break

      if (messages.length < currentMaxTurns) {
        const shouldContinue = await waitWithCountdown(TURN_DELAY_SECONDS)
        if (!shouldContinue || shouldStop) break
      }
    }

    isRunning = false
    if (shouldStop) {
      activeThinkingSpeaker = null
      statusMessage = 'Diálogo pausado.'
    } else if (messages.length >= currentMaxTurns) {
      activeThinkingSpeaker = null
    }
  }

  async function startDialogue() {
    if (isRunning) return
    if (!initialTopic.trim()) {
      errorMessage = 'Por favor introduz um tópico inicial para o LLM 1.'
      return
    }

    errorMessage = ''
    shouldStop = false
    isRunning = true

    messages = []
    totalPromptTokens = 0
    totalCompletionTokens = 0
    totalTokensUsed = 0
    currentMaxTurns = maxTurns
    activeThinkingSpeaker = null

    const firstMessage: ChatMessage = {
      id: crypto.randomUUID(),
      speaker: 'llm1',
      speakerName: getSpeakerName('llm1'),
      model,
      content: initialTopic.trim(),
      turn: 1,
      avatar: agent1Avatar,
      timestamp: Date.now()
    }

    messages = [firstMessage]

    statusMessage = 'A gerar título...'
    let talkTitle = ''
    try {
      talkTitle = await generateTalkTitle(initialTopic, model)
    } catch {
      talkTitle = initialTopic.trim().slice(0, 30)
    }

    const currentUserId = user?.id || pb.authStore.record?.id
    if (currentUserId) {
      statusMessage = 'A guardar conversa...'
      try {
        const newTalk = await pb.collection('talks').create<TalkRecord>({
          title: talkTitle,
          initialTopic: initialTopic.trim(),
          messages: [firstMessage],
          agent1Name,
          agent2Name,
          systemPrompt1,
          systemPrompt2,
          generalRules,
          language,
          model,
          maxTurns: currentMaxTurns,
          maxTokens,
          totalTokens: 0,
          user: currentUserId
        })

        currentTalkId = newTalk.id
        talksState.addOrUpdate(newTalk)
        goto(`/talks/${newTalk.id}`, { replaceState: true, keepFocus: true })
      } catch (err) {
        console.error('Failed to create talk in PocketBase:', err)
      }
    }

    const nextSpeakerName = getSpeakerName('llm2')
    activeThinkingSpeaker = nextSpeakerName
    statusMessage = `${nextSpeakerName} a pensar...`

    if (messages.length < currentMaxTurns) {
      const shouldContinue = await waitWithCountdown(TURN_DELAY_SECONDS)
      if (!shouldContinue || shouldStop) {
        isRunning = false
        activeThinkingSpeaker = null
        if (shouldStop) {
          statusMessage = 'Diálogo pausado.'
        }
        return
      }
    }

    await runDialogueLoop()
  }

  const RANDOM_TURN_DELAY_SECONDS = 3

  async function runRandomDialogueLoop() {
    while (!shouldStop && randomScriptMessages && messages.length < currentMaxTurns) {
      const shouldContinue = await waitWithCountdown(RANDOM_TURN_DELAY_SECONDS)
      if (!shouldContinue || shouldStop) break

      const nextIndex = messages.length
      if (nextIndex >= randomScriptMessages.length) break

      const nextMessage = randomScriptMessages[nextIndex]
      messages = [...messages, nextMessage]

      if (currentTalkId && (user?.id || pb.authStore.record?.id)) {
        try {
          const updated = await pb.collection('talks').update<TalkRecord>(currentTalkId, {
            messages,
            totalTokens: 0
          })
          talksState.addOrUpdate(updated)
        } catch (err) {
          console.error('Failed to update talk in PocketBase:', err)
        }
      }

      if (messages.length >= currentMaxTurns) {
        activeThinkingSpeaker = null
        statusMessage = `Concluído: limite de ${currentMaxTurns} turnos atingido.`
        break
      } else {
        const upcomingSpeaker = randomScriptMessages[messages.length].speakerName
        activeThinkingSpeaker = upcomingSpeaker
        statusMessage = `${upcomingSpeaker} a pensar...`
      }
    }

    isRunning = false
    if (shouldStop) {
      activeThinkingSpeaker = null
      statusMessage = 'Diálogo pausado.'
    } else if (messages.length >= currentMaxTurns) {
      activeThinkingSpeaker = null
    }
  }

  async function startRandomDialogue() {
    if (isRunning) return

    const conv = getRandomConversation(lastRandomId)
    lastRandomId = conv.id

    const [randomAvatar1, randomAvatar2] = getRandomPersonaPair()
    agent1Avatar = randomAvatar1
    agent2Avatar = randomAvatar2

    agent1Name = conv.agent1.name
    systemPrompt1 = conv.agent1.description
    agent2Name = conv.agent2.name
    systemPrompt2 = conv.agent2.description
    initialTopic = conv.agent1.prompts[0]

    const scriptMessages = buildRandomChatMessages(
      conv,
      model,
      agent1Avatar,
      agent2Avatar
    )
    randomScriptMessages = scriptMessages
    isRandomMode = true

    errorMessage = ''
    shouldStop = false
    isRunning = true

    messages = []
    totalPromptTokens = 0
    totalCompletionTokens = 0
    totalTokensUsed = 0
    currentMaxTurns = scriptMessages.length
    activeThinkingSpeaker = null

    const firstMessage = scriptMessages[0]
    messages = [firstMessage]

    const talkTitle = conv.title
    const currentUserId = user?.id || pb.authStore.record?.id

    if (currentUserId) {
      statusMessage = 'A guardar conversa...'
      try {
        const newTalk = await pb.collection('talks').create<TalkRecord>({
          title: talkTitle,
          initialTopic: initialTopic.trim(),
          messages: [firstMessage],
          agent1Name,
          agent2Name,
          systemPrompt1,
          systemPrompt2,
          generalRules,
          language,
          model,
          maxTurns: currentMaxTurns,
          maxTokens,
          totalTokens: 0,
          user: currentUserId
        })

        currentTalkId = newTalk.id
        talksState.addOrUpdate(newTalk)
        setActiveRandomTalk({ talkId: newTalk.id, conv, messages: scriptMessages })
        if (typeof window !== 'undefined') {
          window.history.replaceState(window.history.state, '', `/talks/${newTalk.id}`)
        }
      } catch (err) {
        console.error('Failed to create talk in PocketBase:', err)
      }
    } else {
      setActiveRandomTalk({ conv, messages: scriptMessages })
    }

    const nextSpeakerName = getSpeakerName('llm2')
    activeThinkingSpeaker = nextSpeakerName
    statusMessage = `${nextSpeakerName} a pensar...`

    await runRandomDialogueLoop()
  }

  async function continueDialogue() {
    if (isRunning) return
    if (messages.length === 0) {
      await startDialogue()
      return
    }

    if (isRandomMode && randomScriptMessages && messages.length < randomScriptMessages.length) {
      errorMessage = ''
      shouldStop = false
      isRunning = true
      currentMaxTurns = randomScriptMessages.length

      const nextMessage = randomScriptMessages[messages.length]
      const nextSpeakerName = nextMessage.speakerName
      activeThinkingSpeaker = nextSpeakerName
      statusMessage = `${nextSpeakerName} a pensar...`

      await runRandomDialogueLoop()
      return
    }

    errorMessage = ''
    shouldStop = false
    isRunning = true
    currentMaxTurns = Math.max(currentMaxTurns, messages.length) + maxTurns

    const lastMessage = messages[messages.length - 1]
    const nextSpeaker: 'llm1' | 'llm2' = lastMessage.speaker === 'llm1' ? 'llm2' : 'llm1'
    const nextSpeakerName = getSpeakerName(nextSpeaker)
    activeThinkingSpeaker = nextSpeakerName
    statusMessage = `${nextSpeakerName} a pensar...`

    await runDialogueLoop()
  }

  function stopDialogue() {
    shouldStop = true
    isRunning = false
    activeThinkingSpeaker = null
    statusMessage = 'Diálogo pausado.'
  }
</script>

<Grid direction="column" gap="xl" justify="stretch">
  {#if errorMessage}
    <wa-callout variant="danger">
      <wa-icon slot="start" name="triangle-exclamation" variant="solid"></wa-icon>
      <Grid direction="column" gap="xs">
        <strong>Erro</strong>
        <p>{errorMessage}</p>
      </Grid>
    </wa-callout>
  {/if}
  
  {#if messages.length === 0}
    <Agents
      bind:agent1Name
      bind:agent2Name
      bind:agent1Avatar
      bind:agent2Avatar
      bind:systemPrompt1
      bind:systemPrompt2
    />

    <div class="chat-item">
      <wa-avatar image={agent1Avatar}></wa-avatar>
      <wa-textarea
        maxlength="200"
        value={initialTopic}
        placeholder="Como começa a conversa?"
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
        onclick={startRandomDialogue}
      >
        <wa-icon slot="start" name="shuffle" variant="solid"></wa-icon>
        Random
      </wa-button>

      <wa-button
        role="button"
        tabindex="0"
        variant="brand"
        disabled={isRunning}
        onclick={startDialogue}
      >
        <wa-icon slot="start" name="play" variant="solid"></wa-icon>
        Iniciar Diálogo
      </wa-button>
    </Grid>
  {:else}
    <Conversation {messages} {activeThinkingSpeaker} />

    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <Grid wrap={true} align="center" justify="end" gap="s">
      <wa-button
        role="button"
        tabindex="0"
        variant="brand"
        disabled={isRunning}
        onclick={continueDialogue}
      >
        <wa-icon slot="start" name="play" variant="solid"></wa-icon>
        Continuar
      </wa-button>

      {#if isRunning}
        <wa-button role="button" tabindex="0" variant="danger" onclick={stopDialogue}>
          <wa-icon slot="start" name="pause" variant="solid"></wa-icon>
          Pausar
        </wa-button>
      {/if}
    </Grid>
  {/if}
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
    background-color: var(--wa-color-neutral-10);
  }
}
wa-avatar {
  --size: var(--avatar-size);
}
</style>
