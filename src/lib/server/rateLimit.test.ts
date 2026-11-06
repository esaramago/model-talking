import { describe, it, expect } from 'vitest'
import {
  getUtcDateString,
  getResetAtUtc,
  isLoopbackIp,
  isIpLimitExempt,
  resolveClientIp,
  clearStaleMemoryUsage
} from './rateLimit'

describe('rateLimit server utilities', () => {
  describe('getUtcDateString and getResetAtUtc', () => {
    it('formats UTC date correctly as YYYY-MM-DD', () => {
      const fixedDate = new Date('2026-03-15T14:30:00.000Z')
      expect(getUtcDateString(fixedDate)).toBe('2026-03-15')
    })

    it('calculates the next UTC midnight reset time correctly', () => {
      const fixedDate = new Date('2026-03-15T14:30:00.000Z')
      expect(getResetAtUtc(fixedDate)).toBe('2026-03-16T00:00:00.000Z')
    })
  })

  describe('isLoopbackIp', () => {
    it('identifies loopback, localhost, and missing IPs', () => {
      expect(isLoopbackIp('127.0.0.1')).toBe(true)
      expect(isLoopbackIp('127.0.0.99')).toBe(true)
      expect(isLoopbackIp('::1')).toBe(true)
      expect(isLoopbackIp('::ffff:127.0.0.1')).toBe(true)
      expect(isLoopbackIp('localhost')).toBe(true)
      expect(isLoopbackIp('unknown')).toBe(true)
      expect(isLoopbackIp(undefined)).toBe(true)
      expect(isLoopbackIp(null)).toBe(true)
      expect(isLoopbackIp('')).toBe(true)
    })

    it('identifies public or non-loopback addresses as false', () => {
      expect(isLoopbackIp('192.168.1.1')).toBe(false)
      expect(isLoopbackIp('8.8.8.8')).toBe(false)
      expect(isLoopbackIp('2001:4860:4860::8888')).toBe(false)
    })
  })

  describe('isIpLimitExempt', () => {
    it('exempts loopback addresses during non-production environments', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      expect(isIpLimitExempt('127.0.0.1')).toBe(true)
      expect(isIpLimitExempt('8.8.8.8')).toBe(false)

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('resolveClientIp', () => {
    it('returns address provided by getClientAddress callback', () => {
      expect(resolveClientIp(() => '203.0.113.1')).toBe('203.0.113.1')
    })

    it('returns unknown if callback throws an error', () => {
      expect(
        resolveClientIp(() => {
          throw new Error('Header missing')
        })
      ).toBe('unknown')
    })
  })

  describe('clearStaleMemoryUsage', () => {
    it('clears stale memory entries safely', () => {
      const cleared = clearStaleMemoryUsage('2026-03-15')
      expect(typeof cleared).toBe('number')
    })
  })
})
