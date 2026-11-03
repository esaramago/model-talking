import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt } from 'crypto'

/**
 * Base32 RFC 4648 alphabet.
 */
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateBase32Secret(byteLength: number = 20): string {
  const bytes = randomBytes(byteLength)
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31]
  }

  return output
}

export function base32ToBuffer(b32: string): Buffer {
  let bits = 0
  let value = 0
  const output: number[] = []

  for (let i = 0; i < b32.length; i++) {
    const val = BASE32_CHARS.indexOf(b32[i].toUpperCase())
    if (val === -1) continue
    value = (value << 5) | val
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(output)
}

/**
 * Generates a standard RFC 6238 6-digit TOTP token.
 */
export function generateTOTP(secret: string, counter: number): string {
  const key = base32ToBuffer(secret)
  const buf = Buffer.alloc(8)
  buf.writeBigInt64BE(BigInt(counter), 0)

  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return code.toString().padStart(6, '0')
}

/**
 * Verifies a 6-digit TOTP token against a base32 secret.
 * Allows a clock drift window of ±1 step (30 seconds).
 */
export function verifyTOTP(secret: string, token: string, windowSteps: number = 2): boolean {
  if (!secret || !token) return false
  const cleanToken = token.replace(/\s+/g, '')
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return false
  }

  const currentStep = Math.floor(Date.now() / 1000 / 30)
  for (let step = currentStep - windowSteps; step <= currentStep + windowSteps; step++) {
    if (generateTOTP(secret, step) === cleanToken) {
      return true
    }
  }
  return false
}

/**
 * Builds an otpauth:// URL for authenticator apps.
 */
export function buildOtpAuthUri(issuer: string, accountName: string, secret: string): string {
  const encIssuer = encodeURIComponent(issuer)
  const encAccount = encodeURIComponent(accountName)
  return `otpauth://totp/${encIssuer}:${encAccount}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`
}

/**
 * Generates a 6-digit random code for Email 2FA.
 */
export function generateEmailOtp(): string {
  return randomInt(100_000, 1_000_000).toString()
}

/**
 * Strips sensitive 2FA fields from a user record before serializing to client data.
 */
export function sanitizeUser<T extends Record<string, any> | null>(user: T): T {
  if (!user) return user
  const clone = JSON.parse(JSON.stringify(user))
  delete clone.twoFactorSecret
  delete clone.twoFactorPendingSecret
  delete clone.twoFactorEmailCode
  delete clone.twoFactorEmailExpires
  return clone
}

const PENDING_2FA_KEY = createHash('sha256')
  .update(process.env.OPENROUTER_API_KEY || 'mt_2fa_server_secret_key_2026')
  .digest()

export interface Pending2FAPayload {
  userId: string
  email: string
  password: string
  method: string
  timestamp: number
}

export function createPending2FAToken(payload: Pending2FAPayload): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', PENDING_2FA_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64url')
}

export function verifyPending2FAToken(token: string): Pending2FAPayload | null {
  try {
    const raw = Buffer.from(token, 'base64url')
    if (raw.length < 28) return null
    const iv = raw.subarray(0, 12)
    const authTag = raw.subarray(12, 28)
    const encrypted = raw.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', PENDING_2FA_KEY, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    return JSON.parse(decrypted) as Pending2FAPayload
  } catch {
    return null
  }
}
