import { useSyncExternalStore } from 'react'
import { DEFAULT_BALANCE } from '../constants/defaults.js'
import { roundMoney } from '../utils/chipMath.js'

/**
 * In-memory play-money wallet.
 * Resets to DEFAULT_BALANCE on full page reload (no persistence).
 * Shared across betting / race / settlement overlays.
 */
let balance = DEFAULT_BALANCE
/** Settlement round ids already credited — avoid double-pay on re-render. */
const creditedWins = new Set()
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
 * Credit a settlement win once per round.
 * @param {string | number | null | undefined} roundId
 * @param {number} amount
 * @returns {boolean} true if credited
 */
export function creditWinOnce(roundId, amount) {
  if (roundId == null || !(amount > 0)) return false
  const key = String(roundId)
  if (creditedWins.has(key)) return false
  creditedWins.add(key)
  balance = roundMoney(balance + amount)
  emit()
  return true
}

/**
 * Whether a settlement win was already credited for this round.
 * @param {string | number | null | undefined} roundId
 */
export function wasWinCredited(roundId) {
  if (roundId == null) return false
  return creditedWins.has(String(roundId))
}

/**
 * Refund stake once when a round is cancelled (stake was deducted at place).
 * @param {string | number | null | undefined} roundId
 * @param {number} amount
 * @returns {boolean}
 */
export function refundStakeOnce(roundId, amount) {
  if (roundId == null || !(amount > 0)) return false
  const key = String(roundId)
  if (refundedStakes.has(key)) return false
  refundedStakes.add(key)
  balance = roundMoney(balance + amount)
  emit()
  return true
}

/** @returns {number} */
export function useBalance() {
  return useSyncExternalStore(subscribeBalance, getBalance, getBalance)
}
