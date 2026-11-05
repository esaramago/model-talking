import { DAILY_MESSAGE_LIMIT, MODEL } from '@/lib/config'
import type { DailyQuota } from '@/types/chat'

class StatsState {
  currentTurn = $state(0)
  generatedMessages = $state(0)
  totalTokens = $state(0)
  promptTokens = $state(0)
  completionTokens = $state(0)
  status = $state('Pronto')
  isRunning = $state(false)
  model = $state(MODEL)
  dailyRemaining = $state(DAILY_MESSAGE_LIMIT)
  dailyTotal = $state(DAILY_MESSAGE_LIMIT)
  isUnlimited = $state(false)

  setQuota(quota?: Partial<DailyQuota> | null) {
    if (!quota) return
    if (typeof quota.remaining === 'number') this.dailyRemaining = quota.remaining
    if (typeof quota.total === 'number') this.dailyTotal = quota.total
    if (typeof quota.isUnlimited === 'boolean') this.isUnlimited = quota.isUnlimited
  }
}

export const stats = new StatsState()
