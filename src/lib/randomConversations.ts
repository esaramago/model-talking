import rawConversations from '@/data/randomConversations.json'
import type { ChatMessage } from '@/types/chat'

export interface RandomConversationCharacter {
  name: string
  description: string
  prompts: string[]
}

export interface RandomConversation {
  id: string
  title: string
  agent1: RandomConversationCharacter
  agent2: RandomConversationCharacter
}

export const RANDOM_CONVERSATIONS: RandomConversation[] = rawConversations as RandomConversation[]

export function getRandomConversation(excludeId?: string): RandomConversation {
  const pool = excludeId
    ? RANDOM_CONVERSATIONS.filter((c) => c.id !== excludeId)
    : RANDOM_CONVERSATIONS

  const list = pool.length > 0 ? pool : RANDOM_CONVERSATIONS
  const index = Math.floor(Math.random() * list.length)
  return list[index]
}

export function buildRandomChatMessages(
  conversation: RandomConversation,
  model = 'random-mode'
): ChatMessage[] {
  const result: ChatMessage[] = []
  const maxTurns = 5

  for (let i = 0; i < maxTurns; i++) {
    // Turn from Agent 1 (odd turn number)
    if (conversation.agent1.prompts[i]) {
      result.push({
        id: crypto.randomUUID(),
        speaker: 'llm1',
        speakerName: conversation.agent1.name,
        model,
        content: conversation.agent1.prompts[i],
        turn: result.length + 1,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        timestamp: Date.now()
      })
    }

    // Turn from Agent 2 (even turn number)
    if (conversation.agent2.prompts[i]) {
      result.push({
        id: crypto.randomUUID(),
        speaker: 'llm2',
        speakerName: conversation.agent2.name,
        model,
        content: conversation.agent2.prompts[i],
        turn: result.length + 1,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        timestamp: Date.now()
      })
    }
  }

  return result
}

export interface ActiveRandomTalk {
  talkId?: string
  conv: RandomConversation
  messages: ChatMessage[]
}

let activeRandomTalk: ActiveRandomTalk | null = null

export function setActiveRandomTalk(talk: ActiveRandomTalk | null): void {
  activeRandomTalk = talk
}

export function getActiveRandomTalk(): ActiveRandomTalk | null {
  return activeRandomTalk
}

