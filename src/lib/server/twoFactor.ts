import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from 'crypto'
import type { Cookies } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { getAdminPocketBase } from '@/lib/server/pbAdmin'

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
export function verifyTOTPWithStep(
  secret: string,
  token: string,
  windowSteps: number = 1
): { valid: boolean; step?: number } {
  if (!secret || !token) return { valid: false }
  const cleanToken = token.replace(/\s+/g, '')
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return { valid: false }
  }

  const currentStep = Math.floor(Date.now() / 1000 / 30)
  let matchedStep: number | undefined
  for (let step = currentStep - windowSteps; step <= currentStep + windowSteps; step++) {
    if (verifyOtpCode(generateTOTP(secret, step), cleanToken)) {
      matchedStep = step
    }
  }
  return matchedStep !== undefined ? { valid: true, step: matchedStep } : { valid: false }
}

const usedTotpSteps = new Map<string, { step: number; expiresAt: number }>()

function pruneExpiredTotpSteps(now: number): void {
  if (usedTotpSteps.size < 500) return
  for (const [key, entry] of usedTotpSteps) {
    if (now >= entry.expiresAt) {
      usedTotpSteps.delete(key)
    }
  }
}

/**
 * Verifies a 6-digit TOTP token and consumes its time step for the user,
 * preventing TOTP replay attacks within the ±1 step (90s) validity window.
 */
export async function verifyAndConsumeTOTP(
  userId: string,
  secret: string,
  token: string,
  windowSteps: number = 1
): Promise<boolean> {
  const { valid, step } = verifyTOTPWithStep(secret, token, windowSteps)
  if (!valid || step === undefined) {
    return false
  }

  const now = Date.now()
  pruneExpiredTotpSteps(now)

  const replayKey = `totp:replay:${userId}`
  const windowDurationMs = (windowSteps * 2 + 2) * 30 * 1000
  const expiresAt = now + windowDurationMs

  const memEntry = usedTotpSteps.get(replayKey)
  if (memEntry && now < memEntry.expiresAt && step <= memEntry.step) {
    return false
  }

  try {
    const adminPb = await getAdminPocketBase()
    if (adminPb) {
      try {
        const record = await adminPb.collection('auth_attempts').getFirstListItem(
          adminPb.filter('key = {:key}', { key: replayKey })
        )
        const lastStep = Number(record.count) || 0
        const remoteExpiresAt = Number(record.expiresAt) || 0
        if (now < remoteExpiresAt && step <= lastStep) {
          usedTotpSteps.set(replayKey, { step: lastStep, expiresAt: remoteExpiresAt })
          return false
        }
        await adminPb.collection('auth_attempts').update(record.id, {
          count: step,
          expiresAt
        })
      } catch {
        await adminPb.collection('auth_attempts').create({
          key: replayKey,
          count: step,
          expiresAt
        })
      }
    }
  } catch {
    // Graceful in-memory fallback
  }

  usedTotpSteps.set(replayKey, { step, expiresAt })
  return true
}

const MAX_AUTH_ATTEMPTS = 5
const AUTH_LOCKOUT_WINDOW_MS = 10 * 60 * 1000
const authAttempts = new Map<string, { count: number; expiresAt: number; recordId?: string }>()

function pruneExpiredAuthAttempts(now: number): void {
  if (authAttempts.size < 500) return
  for (const [key, entry] of authAttempts) {
    if (now >= entry.expiresAt) {
      authAttempts.delete(key)
    }
  }
}

export async function isAuthRateLimited(
  key: string,
  maxAttempts: number = MAX_AUTH_ATTEMPTS
): Promise<boolean> {
  const now = Date.now()
  const entry = authAttempts.get(key)
  if (entry) {
    if (now >= entry.expiresAt) {
      authAttempts.delete(key)
    } else if (entry.count >= maxAttempts) {
      return true
    }
  }

  // Check persistent store if available
  try {
    const adminPb = await getAdminPocketBase()
    if (adminPb) {
      const record = await adminPb.collection('auth_attempts').getFirstListItem(
        adminPb.filter('key = {:key}', { key })
      )
      const count = Number(record.count) || 0
      const expiresAt = Number(record.expiresAt) || 0
      if (now < expiresAt) {
        authAttempts.set(key, { count, expiresAt, recordId: record.id })
        return count >= maxAttempts
      } else {
        authAttempts.delete(key)
        adminPb.collection('auth_attempts').delete(record.id).catch(() => {})
        return false
      }
    }
  } catch {
    // Graceful in-memory fallback
  }

  return Boolean(entry && now < entry.expiresAt && entry.count >= maxAttempts)
}

export async function recordFailedAuthAttempt(
  key: string,
  maxAttempts: number = MAX_AUTH_ATTEMPTS,
  windowMs: number = AUTH_LOCKOUT_WINDOW_MS
): Promise<{ attempts: number; locked: boolean }> {
  const now = Date.now()
  pruneExpiredAuthAttempts(now)

  const existing = authAttempts.get(key)
  let count = existing && now < existing.expiresAt ? existing.count + 1 : 1
  let expiresAt = existing && now < existing.expiresAt ? existing.expiresAt : now + windowMs
  let recordId = existing?.recordId

  try {
    const adminPb = await getAdminPocketBase()
    if (adminPb) {
      if (!recordId) {
        try {
          const remote = await adminPb.collection('auth_attempts').getFirstListItem(
            adminPb.filter('key = {:key}', { key })
          )
          recordId = remote.id
          if (now < Number(remote.expiresAt)) {
            count = Math.max(count, (Number(remote.count) || 0) + 1)
            expiresAt = Number(remote.expiresAt)
          }
        } catch {
          // Record doesn't exist yet
        }
      }

      if (recordId) {
        await adminPb.collection('auth_attempts').update(recordId, { count, expiresAt })
      } else {
        const created = await adminPb.collection('auth_attempts').create({ key, count, expiresAt })
        recordId = created.id
      }
    }
  } catch {
    // Graceful in-memory fallback
  }

  authAttempts.set(key, { count, expiresAt, recordId })
  return {
    attempts: count,
    locked: count >= maxAttempts
  }
}

export async function clearAuthAttempts(key: string): Promise<void> {
  const existing = authAttempts.get(key)
  const recordId = existing?.recordId
  authAttempts.delete(key)

  try {
    const adminPb = await getAdminPocketBase()
    if (adminPb) {
      if (recordId) {
        await adminPb.collection('auth_attempts').delete(recordId)
      } else {
        const record = await adminPb.collection('auth_attempts').getFirstListItem(
          adminPb.filter('key = {:key}', { key })
        )
        await adminPb.collection('auth_attempts').delete(record.id)
      }
    }
  } catch {
    // Graceful fallback
  }
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
export const PENDING_TOTP_COOKIE_NAME = 'mt_totp_pending'
let warnedMissingSecret = false

function readConfiguredSecret(): string | undefined {
  const authSecret = (env.AUTH_SECRET || process.env.AUTH_SECRET)?.trim()
  if (authSecret) return authSecret

  // Legacy fallback kept so existing sessions and encrypted TOTP secrets stay valid
  const legacySecret = (env.RATE_LIMIT_SECRET || process.env.RATE_LIMIT_SECRET)?.trim()
  return legacySecret || undefined
}

/**
 * Fails fast in production when no dedicated secret is configured. Without it, sessions would be
 * invalidated on every restart and TOTP secrets encrypted at rest could become undecryptable.
 */
export function assertAuthSecretConfigured(): void {
  if (readConfiguredSecret()) return

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET is not set. Configure a long random value, e.g. "openssl rand -hex 32".'
    )
  }

  if (!warnedMissingSecret) {
    warnedMissingSecret = true
    console.warn(
      '[security] AUTH_SECRET is not set. Using a random per-process secret: sessions reset on restart.'
    )
  }
}

function getBaseServerSecret(): string {
  return readConfiguredSecret() || RUNTIME_SERVER_SECRET
}

/**
 * Derives a domain-separated cryptographic key from the base server secret
 * so cookies, sessions, 2FA tokens, and DB encryption never share raw keys.
 */
export function deriveServerKey(domain: string): string {
  return createHmac('sha256', getBaseServerSecret()).update(`domain:${domain}`).digest('hex')
}

function getServerSecret(): string {
  return deriveServerKey('auth-session')
}

function getTotpEncryptionKey(): Buffer {
  return createHash('sha256').update(deriveServerKey('totp-at-rest')).digest()
}

const ENCRYPTED_SECRET_PREFIX = 'enc:v1:'

/**
 * Encrypts a TOTP Base32 secret using AES-256-GCM before storing at rest in the database.
 */
export function encryptTwoFactorSecret(plainSecret: string): string {
  if (!plainSecret) return ''
  if (plainSecret.startsWith(ENCRYPTED_SECRET_PREFIX)) return plainSecret
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getTotpEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${ENCRYPTED_SECRET_PREFIX}${Buffer.concat([iv, authTag, encrypted]).toString('base64url')}`
}

/**
 * Decrypts a TOTP secret stored in the database, with backwards compatibility for existing plaintext Base32 secrets.
 */
export function decryptTwoFactorSecret(storedValue: string | undefined | null): string {
  if (!storedValue) return ''
  if (!storedValue.startsWith(ENCRYPTED_SECRET_PREFIX)) {
    return /^[A-Z2-7]+=*$/i.test(storedValue.trim()) ? storedValue.trim().toUpperCase() : ''
  }
  try {
    const encoded = storedValue.slice(ENCRYPTED_SECRET_PREFIX.length)
    const raw = Buffer.from(encoded, 'base64url')
    if (raw.length < 28) return ''
    const iv = raw.subarray(0, 12)
    const authTag = raw.subarray(12, 28)
    const encrypted = raw.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', getTotpEncryptionKey(), iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

export interface PendingTotpPayload {
  userId: string
  secret: string
  timestamp: number
}

/**
 * Creates a server-encrypted token holding the pending TOTP secret bound to the user ID.
 */
export function createPendingTotpToken(userId: string, secret: string): string {
  const payload: PendingTotpPayload = {
    userId,
    secret,
    timestamp: Date.now()
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getPending2FAKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64url')
}

/**
 * Verifies and extracts the pending TOTP secret bound to the expected user ID.
 */
export function verifyPendingTotpToken(
  token: string | undefined,
  expectedUserId: string
): string | null {
  if (!token || !expectedUserId) return null
  try {
    const raw = Buffer.from(token, 'base64url')
    if (raw.length < 28) return null
    const iv = raw.subarray(0, 12)
    const authTag = raw.subarray(12, 28)
    const encrypted = raw.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', getPending2FAKey(), iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    const parsed = JSON.parse(decrypted) as PendingTotpPayload
    if (
      !parsed ||
      parsed.userId !== expectedUserId ||
      !parsed.secret ||
      typeof parsed.timestamp !== 'number' ||
      Date.now() - parsed.timestamp > 30 * 60 * 1000
    ) {
      return null
    }
    return parsed.secret
  } catch {
    return null
  }
}

const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30
const AUTH_SESSION_MAX_AGE_MS = AUTH_SESSION_MAX_AGE_SEC * 1000
const PROFILE_OTP_MAX_AGE_MS = 10 * 60 * 1000

/**
 * Signs an authenticated user session with an expiration timestamp and random nonce
 * to prove login/2FA passed through the server and prevent static signature replay.
 */
export function signAuthSession(userId: string, now: number = Date.now()): string {
  const expiresAt = now + AUTH_SESSION_MAX_AGE_MS
  const nonce = randomBytes(16).toString('hex')
  const payload = `${userId}.${expiresAt}.${nonce}`
  const hmac = createHmac('sha256', getServerSecret()).update(`auth:${payload}`).digest('hex')
  return `${payload}.${hmac}`
}

/**
 * Verifies that the server-signed auth session cookie is authentic, unexpired,
 * and matches the active PocketBase user ID.
 */
export function verifyAuthSession(
  cookieValue: string | undefined,
  expectedUserId: string | undefined,
  now: number = Date.now()
): boolean {
  if (!cookieValue || !expectedUserId) return false
  const parts = cookieValue.split('.')
  if (parts.length !== 4) return false

  const [userId, expiresAtStr, nonce, signature] = parts
  if (!userId || !expiresAtStr || !nonce || !signature || userId !== expectedUserId) {
    return false
  }

  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt) || now >= expiresAt) {
    return false
  }

  const payload = `${userId}.${expiresAtStr}.${nonce}`
  const expected = createHmac('sha256', getServerSecret()).update(`auth:${payload}`).digest('hex')
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
    maxAge: AUTH_SESSION_MAX_AGE_SEC
  })
}

export function clearAuthSessionCookie(cookies: Cookies): void {
  cookies.delete(AUTH_SESSION_COOKIE_NAME, { path: '/' })
}

export interface ProfileOtpPayload {
  userId: string
  otpId: string
  timestamp: number
}

/**
 * Encrypts and authenticates a profile email 2FA setup OTP ID bound to a specific user ID.
 */
export function createProfileOtpToken(userId: string, otpId: string): string {
  const payload: ProfileOtpPayload = {
    userId,
    otpId,
    timestamp: Date.now()
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getPending2FAKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64url')
}

/**
 * Verifies a profile email 2FA setup token and ensures it belongs to the expected user ID.
 */
export function verifyProfileOtpToken(
  token: string | undefined,
  expectedUserId: string
): string | null {
  if (!token || !expectedUserId) return null
  try {
    const raw = Buffer.from(token, 'base64url')
    if (raw.length < 28) return null
    const iv = raw.subarray(0, 12)
    const authTag = raw.subarray(12, 28)
    const encrypted = raw.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', getPending2FAKey(), iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    const parsed = JSON.parse(decrypted) as ProfileOtpPayload
    if (
      !parsed ||
      parsed.userId !== expectedUserId ||
      !parsed.otpId ||
      typeof parsed.timestamp !== 'number' ||
      Date.now() - parsed.timestamp > PROFILE_OTP_MAX_AGE_MS
    ) {
      return null
    }
    return parsed.otpId
  } catch {
    return null
  }
}

function getPending2FAKey(): Buffer {
  return createHash('sha256').update(`2fa:${getServerSecret()}`).digest()
}

export interface Pending2FAPayload {
  userId: string
  pbToken: string
  method: string
  otpId?: string
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
