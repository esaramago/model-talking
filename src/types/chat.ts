export interface ChatMessage {
  id: string
  speaker: 'llm1' | 'llm2'
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

export interface ModelOption {
  label: string
  value: string
  isFree?: boolean
}

export interface LanguageOption {
  label: string
  value: string
}

export interface ChatSettings {
  initialTopic: string
  maxTokens: number
  model: string
  agent1Name: string
  agent2Name: string
  systemPrompt1: string
  systemPrompt2: string
  generalRules: string
  language: string
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
  totalTokens?: number
  user?: string
  created?: string
  updated?: string
}

