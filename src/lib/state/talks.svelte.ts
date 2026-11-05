import { pb } from '@/lib/pocketbase'
import type { TalkRecord, TalkSummary } from '@/types/chat'

class TalksState {
  items = $state<TalkSummary[]>([])
  newChatTrigger = $state(0)
  pendingRestartAgents = $state<{
    agent1Name: string
    agent2Name: string
    agent1Avatar: string
    agent2Avatar: string
    systemPrompt1: string
    systemPrompt2: string
  } | null>(null)
  private isSubscribed = false

  triggerNewChat() {
    this.newChatTrigger++
  }

  setTalks(talks: TalkSummary[]) {
    this.items = talks
  }

  addOrUpdate({ id, title, created }: TalkSummary) {
    const summary = { id, title, created }
    const index = this.items.findIndex((item) => item.id === id)
    if (index !== -1) {
      this.items[index] = summary
    } else {
      this.items = [summary, ...this.items]
    }
  }

  remove(id: string) {
    this.items = this.items.filter((item) => item.id !== id)
  }

  async delete(id: string) {
    await pb.collection('talks').delete(id)
    this.remove(id)
  }

  subscribe() {
    if (this.isSubscribed || typeof window === 'undefined') return
    this.isSubscribed = true

    try {
      pb.collection('talks').subscribe<TalkRecord>('*', (e) => {
        const currentUserId = pb.authStore.record?.id
        if (!currentUserId || (e.record.user && e.record.user !== currentUserId)) {
          return
        }

        if (e.action === 'create' || e.action === 'update') {
          this.addOrUpdate(e.record)
        } else if (e.action === 'delete') {
          this.remove(e.record.id)
        }
      })
    } catch (err) {
      console.warn('Failed to subscribe to talks realtime:', err)
    }
  }

  unsubscribe() {
    if (!this.isSubscribed || typeof window === 'undefined') return
    try {
      pb.collection('talks').unsubscribe('*')
    } catch {
      // Ignore unsubscribe error
    }
    this.isSubscribed = false
  }
}

export const talksState = new TalksState()
