import type PocketBase from 'pocketbase'
import type { UserRecord } from '@/types/user'

declare global {
  interface Window {
    umami?: {
      track: (
        eventName: string | ((props: Record<string, unknown>) => Record<string, unknown>),
        eventData?: Record<string, string | number | boolean>
      ) => void
    }
  }

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
