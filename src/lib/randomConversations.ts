import rawConversations from '@/data/randomConversations.json'
import { AVAILABLE_PERSONAS } from '@/lib/config'

export interface RandomConversationCharacter {
  name: string
  description: string
  avatar?: string
  prompts: string[]
}

export interface RandomConversation {
  id: string
  title: string
  agent1: RandomConversationCharacter
  agent2: RandomConversationCharacter
}

export { AVAILABLE_PERSONAS }

export function getPersonaImageUrl(personaId: string | number): string {
  return `/img/personas/${personaId}.svg`
}

export function getRandomPersonaPair(): [string, string] {
  const pool = [...AVAILABLE_PERSONAS]
  const idx1 = Math.floor(Math.random() * pool.length)
  const persona1 = pool.splice(idx1, 1)[0]
  const idx2 = Math.floor(Math.random() * pool.length)
  const persona2 = pool[idx2]
  return [getPersonaImageUrl(persona1), getPersonaImageUrl(persona2)]
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
