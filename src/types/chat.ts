export interface ChatMessage {
  id: string
  speaker: 'agent1' | 'agent2'
  speakerName: string
  model: string
  content: string
  turn: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  avatar?: string
  timestamp: number
}

export interface LanguageOption {
  label: string
  value: string
}

export interface ChatSettings {
  generalRules: string
  language: string
  maxChars: number
}

export interface AgentDraft {
  initialTopic: string
  agent1Name: string
  agent2Name: string
  systemPrompt1: string
  systemPrompt2: string
}

export interface DailyQuota {
  remaining: number
  total: number
  isUnlimited: boolean
  resetAt: string
}

export interface TalkRecord {
  id: string
  title: string
  initialTopic: string
  messages: ChatMessage[]
  agent1Name?: string
  agent2Name?: string
  systemPrompt1?: string
  systemPrompt2?: string
  generalRules?: string
  language?: string
  model?: string
  maxTokens?: number
  maxChars?: number
  totalTokens?: number
  user?: string
  created?: string
  updated?: string
}

export type TalkSummary = Pick<TalkRecord, 'id' | 'title' | 'created'>
