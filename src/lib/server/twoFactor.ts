import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual
} from 'crypto'
import type { Cookies } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'

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
 * Compares two 6-digit OTP codes in constant time to prevent timing attacks.
 */
export function verifyOtpCode(expectedCode: string, providedCode: string): boolean {
  if (!expectedCode || !providedCode) return false
  const cleanExpected = expectedCode.replace(/\s+/g, '')
  const cleanProvided = providedCode.replace(/\s+/g, '')
  if (
    cleanExpected.length !== 6 ||
    cleanProvided.length !== 6 ||
    !/^\d{6}$/.test(cleanExpected) ||
    !/^\d{6}$/.test(cleanProvided)
  ) {
    return false
  }

  const expBuf = Buffer.from(cleanExpected, 'utf8')
  const provBuf = Buffer.from(cleanProvided, 'utf8')
  if (expBuf.length !== provBuf.length) return false
  return timingSafeEqual(expBuf, provBuf)
}

/**
 * Verifies a 6-digit TOTP token against a base32 secret in constant time.
 * Allows a clock drift window of ±1 step (30 seconds).
 */
export function verifyTOTP(secret: string, token: string, windowSteps: number = 1): boolean {
  if (!secret || !token) return false
  const cleanToken = token.replace(/\s+/g, '')
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return false
  }

  const currentStep = Math.floor(Date.now() / 1000 / 30)
  let matched = false
  for (let step = currentStep - windowSteps; step <= currentStep + windowSteps; step++) {
    if (verifyOtpCode(generateTOTP(secret, step), cleanToken)) {
      matched = true
    }
  }
  return matched
}

const MAX_AUTH_ATTEMPTS = 5
const AUTH_LOCKOUT_WINDOW_MS = 10 * 60 * 1000
const authAttempts = new Map<string, { count: number; expiresAt: number }>()

function pruneExpiredAuthAttempts(now: number): void {
  if (authAttempts.size < 500) return
  for (const [key, entry] of authAttempts) {
    if (now >= entry.expiresAt) {
      authAttempts.delete(key)
    }
  }
}

export function isAuthRateLimited(
  key: string,
  maxAttempts: number = MAX_AUTH_ATTEMPTS
): boolean {
  const now = Date.now()
  const entry = authAttempts.get(key)
  if (!entry) return false
  if (now >= entry.expiresAt) {
    authAttempts.delete(key)
    return false
  }
  return entry.count >= maxAttempts
}

export function recordFailedAuthAttempt(
  key: string,
  maxAttempts: number = MAX_AUTH_ATTEMPTS,
  windowMs: number = AUTH_LOCKOUT_WINDOW_MS
): { attempts: number; locked: boolean } {
  const now = Date.now()
  pruneExpiredAuthAttempts(now)

  const existing = authAttempts.get(key)
  const count = existing && now < existing.expiresAt ? existing.count + 1 : 1
  const expiresAt = existing && now < existing.expiresAt ? existing.expiresAt : now + windowMs

  authAttempts.set(key, { count, expiresAt })
  return {
    attempts: count,
    locked: count >= maxAttempts
  }
}

export function clearAuthAttempts(key: string): void {
  authAttempts.delete(key)
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

const RUNTIME_SERVER_SECRET = randomBytes(32).toString('hex')
export const AUTH_SESSION_COOKIE_NAME = 'mt_auth_sig'

function getServerSecret(): string {
  return (
    env.RATE_LIMIT_SECRET ||
    env.OPENROUTER_API_KEY ||
    process.env.RATE_LIMIT_SECRET ||
    process.env.OPENROUTER_API_KEY ||
    RUNTIME_SERVER_SECRET
  )
}

/**
 * Signs an authenticated user ID to prove login/2FA passed through the server.
 */
export function signAuthSession(userId: string): string {
  const hmac = createHmac('sha256', getServerSecret()).update(`auth:${userId}`).digest('hex')
  return `${userId}.${hmac}`
}

/**
 * Verifies that the server-signed auth session cookie matches the active PocketBase user ID.
 */
export function verifyAuthSession(
  cookieValue: string | undefined,
  expectedUserId: string | undefined
): boolean {
  if (!cookieValue || !expectedUserId || !cookieValue.includes('.')) return false
  const [userId, signature] = cookieValue.split('.')
  if (!userId || !signature || userId !== expectedUserId) return false

  const expected = createHmac('sha256', getServerSecret()).update(`auth:${userId}`).digest('hex')
  const sigBuffer = Buffer.from(signature)
  const expBuffer = Buffer.from(expected)

  if (sigBuffer.length !== expBuffer.length) return false
  return timingSafeEqual(sigBuffer, expBuffer)
}

export function setAuthSessionCookie(cookies: Cookies, userId: string): void {
  cookies.set(AUTH_SESSION_COOKIE_NAME, signAuthSession(userId), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30
  })
}

export function clearAuthSessionCookie(cookies: Cookies): void {
  cookies.delete(AUTH_SESSION_COOKIE_NAME, { path: '/' })
}

function getPending2FAKey(): Buffer {
  return createHash('sha256').update(`2fa:${getServerSecret()}`).digest()
}

export interface Pending2FAPayload {
  userId: string
  pbToken: string
  method: string
  timestamp: number
}

export function createPending2FAToken(payload: Pending2FAPayload): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getPending2FAKey(), iv)
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
    const decipher = createDecipheriv('aes-256-gcm', getPending2FAKey(), iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    return JSON.parse(decrypted) as Pending2FAPayload
  } catch {
    return null
  }
}
