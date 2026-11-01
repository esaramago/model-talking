import { pb } from '@/lib/pocketbase'
import type { TalkRecord } from '@/types/chat'

class TalksState {
  items = $state<TalkRecord[]>([])
  isLoading = $state(false)
  newChatTrigger = $state(0)
  private isSubscribed = false

  triggerNewChat() {
    this.newChatTrigger++
  }

  setTalks(talks: TalkRecord[]) {
    this.items = talks
  }

  addOrUpdate(talk: TalkRecord) {
    const index = this.items.findIndex((item) => item.id === talk.id)
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...talk }
    } else {
      this.items = [talk, ...this.items]
    }
  }

  remove(id: string) {
    this.items = this.items.filter((item) => item.id !== id)
  }

  async refresh() {
    const currentUserId = pb.authStore.record?.id
    if (!currentUserId) {
      this.items = []
      return
    }

    try {
      this.isLoading = true
      const records = await pb.collection('talks').getFullList<TalkRecord>({
        filter: pb.filter('user = {:userId}', { userId: currentUserId }),
        sort: '-created'
      })
      this.items = records
    } catch (err) {
      console.warn('Failed to refresh talks from PocketBase:', err)
    } finally {
      this.isLoading = false
    }
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
