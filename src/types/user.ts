import type { RecordModel } from 'pocketbase'

export type UserRole = 'admin' | 'user'

export interface UserRecord extends RecordModel {
  role?: UserRole
  language?: string
  generalRules?: string
}
