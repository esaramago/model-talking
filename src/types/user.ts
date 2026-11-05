import type { RecordModel } from 'pocketbase'

export type UserRole = 'admin' | 'user'
export type TwoFactorMethod = 'none' | 'email' | 'authenticator'

export interface UserRecord extends RecordModel {
  name?: string
  email?: string
  role?: UserRole
  language?: string
  generalRules?: string
  maxChars?: number
  twoFactorMethod?: TwoFactorMethod
  twoFactorSecret?: string
  twoFactorPendingSecret?: string
}
