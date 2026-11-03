import { MODEL } from '@/lib/config'

class StatsState {
  currentTurn = $state(0)
  generatedMessages = $state(0)
  totalTokens = $state(0)
  promptTokens = $state(0)
  completionTokens = $state(0)
  status = $state('Pronto')
  isRunning = $state(false)
  model = $state(MODEL)

  reset() {
    this.currentTurn = 0
    this.generatedMessages = 0
    this.totalTokens = 0
    this.promptTokens = 0
    this.completionTokens = 0
    this.status = 'Pronto'
    this.isRunning = false
    this.model = MODEL
  }
}

export const stats = new StatsState()
