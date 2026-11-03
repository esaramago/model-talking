import type PocketBase from 'pocketbase'
import type { UserRecord } from '@/types/user'

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      pb: PocketBase
      user: UserRecord | null
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
