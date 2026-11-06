import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getLanguageInstruction,
  estimateTextTokens,
  budgetMessages,
  buildMessagesForModel,
  generateTalkTitle,
  generateAgentName
} from './chat'
import type { ChatMessage } from '@/types/chat'

describe('chat utilities', () => {
  describe('estimateTextTokens', () => {
    it('estimates text tokens accurately based on character length', () => {
      expect(estimateTextTokens('')).toBe(0)
      expect(estimateTextTokens('hello')).toBe(2)
      expect(estimateTextTokens('short sentence')).toBe(4)
    })
  })

  describe('getLanguageInstruction', () => {
    it('returns empty string for default English variants', () => {
      expect(getLanguageInstruction()).toBe('')
      expect(getLanguageInstruction('en')).toBe('')
      expect(getLanguageInstruction('en-US')).toBe('')
      expect(getLanguageInstruction('english')).toBe('')
      expect(getLanguageInstruction('inglês')).toBe('')
    })

    it('returns exact instructions for known supported languages', () => {
      expect(getLanguageInstruction('pt-pt')).toBe('Responde sempre em português de Portugal (pt-PT).')
      expect(getLanguageInstruction('pt')).toBe('Responde sempre em português de Portugal (pt-PT).')
      expect(getLanguageInstruction('es')).toBe('Responde siempre en español.')
      expect(getLanguageInstruction('fr')).toBe('Réponds toujours en français.')
      expect(getLanguageInstruction('de')).toBe('Antworte immer auf Deutsch.')
      expect(getLanguageInstruction('it')).toBe('Rispondi sempre in italiano.')
      expect(getLanguageInstruction('tr')).toBe('Her zaman Türkçe yanıt ver.')
      expect(getLanguageInstruction('ru')).toBe('Всегда отвечай на русском языке.')
      expect(getLanguageInstruction('ar')).toBe('أجب دائمًا باللغة العربية.')
    })

    it('falls back to generic response format for unknown languages', () => {
      expect(getLanguageInstruction('japanese')).toBe('Responde sempre em japanese.')
    })
  })

  describe('budgetMessages', () => {
    const createSampleMessages = (count: number): ChatMessage[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `msg-${i + 1}`,
        speaker: i % 2 === 0 ? 'agent1' : 'agent2',
        speakerName: i % 2 === 0 ? 'Alice' : 'Bob',
        model: 'test-model',
        turn: i + 1,
        content: `Message ${i + 1} with some extra text content to consume tokens`,
        timestamp: Date.now() + i * 1000
      }))
    }

    it('returns messages untouched when count is <= 2', () => {
      const messages = createSampleMessages(2)
      expect(budgetMessages(messages, 'agent1', 10)).toEqual(messages)
    })

    it('returns messages untouched when total tokens fit available budget', () => {
      const messages = createSampleMessages(4)
      expect(budgetMessages(messages, 'agent1', 1000)).toEqual(messages)
    })

    it('prunes older messages while preserving anchors when budget is exceeded', () => {
      const messages = createSampleMessages(10)
      const budgeted = budgetMessages(messages, 'agent1', 50)

      // Agent 1 anchor count is 2
      expect(budgeted.length).toBeLessThan(messages.length)
      expect(budgeted[0].id).toBe('msg-1')
      expect(budgeted[1].id).toBe('msg-2')
    })
  })

  describe('buildMessagesForModel', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        speaker: 'agent1',
        speakerName: 'Aristotle',
        model: 'test-model',
        turn: 1,
        content: 'What is virtue?',
        timestamp: 1
      },
      {
        id: '2',
        speaker: 'agent2',
        speakerName: 'Plato',
        model: 'test-model',
        turn: 2,
        content: 'Virtue is knowledge.',
        timestamp: 2
      }
    ]

    it('formats messages correctly for agent2', () => {
      const apiMessages = buildMessagesForModel(
        messages,
        'agent2',
        'You are Plato.',
        'Be respectful.',
        'Plato',
        'en',
        200
      )

      expect(apiMessages[0].role).toBe('system')
      expect(apiMessages[1].role).toBe('user')
      expect(apiMessages[1].content).toBe('What is virtue?')
      expect(apiMessages[2].role).toBe('assistant')
      expect(apiMessages[2].content).toBe('Virtue is knowledge.')
    })

    it('formats messages correctly for agent1 with combined opening context', () => {
      const apiMessages = buildMessagesForModel(
        messages,
        'agent1',
        'You are Aristotle.',
        'Be analytical.',
        'Aristotle',
        'en',
        200
      )

      expect(apiMessages[0].role).toBe('system')
      expect(apiMessages[1].role).toBe('user')
      expect(apiMessages[1].content).toContain('Opening context:')
      expect(apiMessages[1].content).toContain('Plato replied: "Virtue is knowledge."')
    })
  })

  describe('generateTalkTitle and generateAgentName with API calls', () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
      vi.restoreAllMocks()
    })

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    it('generates talk title and strips quotes', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: '«Filosofia e Ética»' })
      })

      const title = await generateTalkTitle('Debate sobre a ética')
      expect(title).toBe('Filosofia e Ética')
    })

    it('falls back to prompt slice if AI title generation fails', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const title = await generateTalkTitle('Debate filosófico longo sobre o sentido da vida')
      expect(title).toBe('Debate filosófico longo sobre')
    })

    it('generates agent name and cleans name prefixes and quotes', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: 'Personagem: "Sócrates"' })
      })

      const name = await generateAgentName('Filósofo grego clássico', 'Filósofo')
      expect(name).toBe('Sócrates')
    })

    it('returns fallback name when description is blank or fails', async () => {
      const name = await generateAgentName('   ', 'Agente Padrão')
      expect(name).toBe('Agente Padrão')
    })
  })
})
