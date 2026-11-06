import { describe, it, expect } from 'vitest'
import {
  generateBase32Secret,
  base32ToBuffer,
  verifyOtpCode,
  generateTOTP,
  verifyTOTPWithStep
} from './twoFactor'

describe('twoFactor server utilities', () => {
  it('generates a base32 secret of valid length and character set', () => {
    const secret = generateBase32Secret(20)
    expect(secret).toMatch(/^[A-Z2-7]+$/)
    expect(secret.length).toBe(32)
  })

  it('converts base32 to buffer correctly', () => {
    const secret = generateBase32Secret(20)
    const buf = base32ToBuffer(secret)
    expect(buf.length).toBe(20)
  })

  it('verifies OTP code with constant time matching', () => {
    expect(verifyOtpCode('123456', '123456')).toBe(true)
    expect(verifyOtpCode('123456', ' 123 456 ')).toBe(true)
    expect(verifyOtpCode('123456', '654321')).toBe(false)
    expect(verifyOtpCode('123456', '12345')).toBe(false)
    expect(verifyOtpCode('', '123456')).toBe(false)
    expect(verifyOtpCode('abcdef', 'abcdef')).toBe(false)
  })

  it('generates valid 6-digit TOTP tokens', () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    const token = generateTOTP(secret, 1000)
    expect(token).toMatch(/^\d{6}$/)
  })

  it('verifies TOTP token within step drift allowance', () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    const currentStep = Math.floor(Date.now() / 1000 / 30)

    // Current step
    const currentToken = generateTOTP(secret, currentStep)
    expect(verifyTOTPWithStep(secret, currentToken)).toEqual({
      valid: true,
      step: currentStep
    })

    // Window drift: previous step (-1)
    const prevToken = generateTOTP(secret, currentStep - 1)
    expect(verifyTOTPWithStep(secret, prevToken)).toEqual({
      valid: true,
      step: currentStep - 1
    })

    // Window drift: next step (+1)
    const nextToken = generateTOTP(secret, currentStep + 1)
    expect(verifyTOTPWithStep(secret, nextToken)).toEqual({
      valid: true,
      step: currentStep + 1
    })

    // Out of default window drift (2 steps away)
    const farToken = generateTOTP(secret, currentStep - 2)
    expect(verifyTOTPWithStep(secret, farToken).valid).toBe(false)

    // Invalid token format
    expect(verifyTOTPWithStep(secret, '000').valid).toBe(false)
    expect(verifyTOTPWithStep('', currentToken).valid).toBe(false)
  })
})
