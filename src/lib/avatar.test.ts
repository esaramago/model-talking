import { describe, it, expect } from 'vitest'
import { sanitizeMessagesForStorage } from './avatar'
import type { ChatMessage } from '@/types/chat'

describe('avatar sanitization utilities', () => {
  it('keeps avatar only on first message for each speaker', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        speaker: 'agent1',
        speakerName: 'Agent 1',
        model: 'test-model',
        turn: 1,
        content: 'Hello from Agent 1',
        avatar: 'data:image/svg+xml;utf8,<svg>1</svg>',
        timestamp: Date.now()
      },
      {
        id: '2',
        speaker: 'agent2',
        speakerName: 'Agent 2',
        model: 'test-model',
        turn: 2,
        content: 'Hello from Agent 2',
        avatar: 'data:image/svg+xml;utf8,<svg>2</svg>',
        timestamp: Date.now()
      },
      {
        id: '3',
        speaker: 'agent1',
        speakerName: 'Agent 1',
        model: 'test-model',
        turn: 3,
        content: 'Second message Agent 1',
        avatar: 'data:image/svg+xml;utf8,<svg>1</svg>',
        timestamp: Date.now()
      },
      {
        id: '4',
        speaker: 'agent2',
        speakerName: 'Agent 2',
        model: 'test-model',
        turn: 4,
        content: 'Second message Agent 2',
        avatar: 'data:image/svg+xml;utf8,<svg>2</svg>',
        timestamp: Date.now()
      }
    ]

    const sanitized = sanitizeMessagesForStorage(messages)

    expect(sanitized[0].avatar).toBe('data:image/svg+xml;utf8,<svg>1</svg>')
    expect(sanitized[1].avatar).toBe('data:image/svg+xml;utf8,<svg>2</svg>')
    expect(sanitized[2].avatar).toBeUndefined()
    expect(sanitized[3].avatar).toBeUndefined()
  })

  it('drops avatars exceeding 50KB size threshold', () => {
    const hugeAvatar = 'data:image/png;base64,' + 'A'.repeat(55_000)
    const messages: ChatMessage[] = [
      {
        id: '1',
        speaker: 'agent1',
        speakerName: 'Agent 1',
        model: 'test-model',
        turn: 1,
        content: 'Heavy avatar',
        avatar: hugeAvatar,
        timestamp: Date.now()
      }
    ]

    const sanitized = sanitizeMessagesForStorage(messages)
    expect(sanitized[0].avatar).toBeUndefined()
  })

  it('preserves messages that have no avatar without alteration', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        speaker: 'agent1',
        speakerName: 'Agent 1',
        model: 'test-model',
        turn: 1,
        content: 'No avatar',
        timestamp: 12345
      }
    ]

    const sanitized = sanitizeMessagesForStorage(messages)
    expect(sanitized[0]).toEqual(messages[0])
  })
})
