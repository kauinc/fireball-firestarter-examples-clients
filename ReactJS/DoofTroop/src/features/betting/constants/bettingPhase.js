/**
 * Local betting-window phases for the betting HUD.
 */
export const BettingPhase = Object.freeze({
  /** PLACE YOUR BETS — countdown running */
  OPEN: 'open',
  /** BETS CLOSING — final seconds before the window closes */
  CLOSING: 'closing',
  /** BETS CLOSED — timer at 0 / BETTING_CLOSED / TRACK_READY countdown */
  CLOSED: 'closed',
  /** Betting UI hidden — outside the betting + pre-race window */
  HIDDEN: 'hidden',
})

/** TimerBar.png color treatment for the betting window. */
export const TimerBarVariant = Object.freeze({
  DEFAULT: 'default',
  YELLOW: 'yellow',
  /** Alternate red / yellow while ≤ flash threshold. */
  FLASH: 'flash',
  RED: 'red',
})

/** Client-side betting window length while ROUND_CREATED / BETTING_OPEN. */
export const BETTING_WINDOW_SECONDS = 30

/** Show BETS CLOSING + yellow TimerBar when this many seconds (or fewer) remain. */
export const BETTING_CLOSING_THRESHOLD_SECONDS = 10

/** Flash red/yellow TimerBar when this many seconds (or fewer) remain. */
export const BETTING_FLASH_THRESHOLD_SECONDS = 5

export const BETTING_BANNER = Object.freeze({
  [BettingPhase.OPEN]: 'PLACE YOUR BETS',
  [BettingPhase.CLOSING]: 'BETS CLOSING',
  [BettingPhase.CLOSED]: 'BETS CLOSED',
})

/**
 * @param {number} secondsLeft
 * @param {string} phase
 * @returns {string}
 */
export function timerBarVariantFor(secondsLeft, phase) {
  if (phase === BettingPhase.CLOSED) return TimerBarVariant.RED
  if (phase !== BettingPhase.CLOSING) return TimerBarVariant.DEFAULT
  if (secondsLeft <= BETTING_FLASH_THRESHOLD_SECONDS) {
    return TimerBarVariant.FLASH
  }
  return TimerBarVariant.YELLOW
}