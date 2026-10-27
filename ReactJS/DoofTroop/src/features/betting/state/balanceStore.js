import { useSyncExternalStore } from 'react'
import { DEFAULT_BALANCE } from '../constants/defaults.js'
import { roundMoney } from '../utils/chipMath.js'

/**
 * In-memory play-money wallet.
 * Resets to DEFAULT_BALANCE on full page reload (no persistence).
 * Shared across betting / race / settlement overlays.
 */
let balance = DEFAULT_BALANCE
/**
 * Win amount credited per settled round id. A round is closed exactly once:
 * either settled (this map) or refunded (`refundedStakes`) — never both.
 * @type {Map<string, number>}
 */
const creditedWins = new Map()
/** Cancelled round ids already refunded. */
const refundedStakes = new Set()
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

export function getBalance() {
  return balance
}

export function subscribeBalance(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Move wallet by `delta` (negative = spend). Rejects if result would go below 0.
 * @param {number} delta
 * @returns {boolean}
 */
export function adjustBalance(delta) {
  const next = roundMoney(balance + delta)
  if (next < 0) return false
  if (next === balance) return true
  balance = next
  emit()
  return true
}

/**
 * Settle a round's win. Re-settling the same round (e.g. corrected
 * placements) applies only the difference, so the wallet always matches the
 * latest settlement. No-op for rounds already refunded as cancelled.
 * @param {string | number | null | undefined} roundId
 * @param {number} amount - total win for the round (0 when nothing won)
 * @returns {boolean} true if the balance changed
 */
export function settleRoundWin(roundId, amount) {
  if (roundId == null) return false
  const key = String(roundId)
  if (refundedStakes.has(key)) return false
  const next = amount > 0 ? roundMoney(amount) : 0
  const prev = creditedWins.get(key) ?? 0
  creditedWins.set(key, next)
  const delta = roundMoney(next - prev)
  if (delta === 0) return false
  balance = Math.max(0, roundMoney(balance + delta))
  emit()
  return true
}

/**
 * Win amount already credited for this round (0 when none).
 * @param {string | number | null | undefined} roundId
 * @returns {number}
 */
export function creditedWinFor(roundId) {
  if (roundId == null) return 0
  return creditedWins.get(String(roundId)) ?? 0
}

/**
 * Refund stake once when a round is cancelled (stake was deducted at place).
 * No-op for rounds that were already settled.
 * @param {string | number | null | undefined} roundId
 * @param {number} amount
 * @returns {boolean}
 */
export function refundStakeOnce(roundId, amount) {
  if (roundId == null || !(amount > 0)) return false
  const key = String(roundId)
  if (refundedStakes.has(key) || creditedWins.has(key)) return false
  refundedStakes.add(key)
  balance = roundMoney(balance + amount)
  emit()
  return true
}

/** @returns {number} */
export function useBalance() {
  return useSyncExternalStore(subscribeBalance, getBalance, getBalance)
}
