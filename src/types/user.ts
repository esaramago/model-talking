import type { RecordModel } from 'pocketbase'

export type UserRole = 'admin' | 'free' | 'paid'

export interface UserRecord extends RecordModel {
  role?: UserRole
  language?: string
  generalRules?: string
}
