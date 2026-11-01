class StatsState {
  currentTurn = $state(0)
  maxTurns = $state(4)
  totalTokens = $state(0)
  promptTokens = $state(0)
  completionTokens = $state(0)
  status = $state('Pronto')
  isRunning = $state(false)

  reset() {
    this.currentTurn = 0
    this.totalTokens = 0
    this.promptTokens = 0
    this.completionTokens = 0
    this.status = 'Pronto'
    this.isRunning = false
  }
}

export const stats = new StatsState()
