import { useSyncExternalStore } from 'react'
import { DEFAULT_BALANCE } from '../constants/defaults.js'
import { roundMoney } from '../utils/chipMath.js'

/**
 * HUD wallet mirror of RGS absolute balance.
 * Authority: auth / CF Balance fields / getBalance — never local chip deltas.
 */
let balance = DEFAULT_BALANCE
/**
 * Win amount from CF settle-result per round (for settlement display hold-back).
 * @type {Map<string, number>}
 */
const creditedWins = new Map()
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

export function getBalance() {
  return balance
}

/**
 * Replace wallet from RGS / auth (absolute money units, not cents).
 * @param {number} next
 */
export function setBalance(next) {
  const value = roundMoney(Number(next))
  if (!Number.isFinite(value) || value < 0) return
  if (value === balance) return
  balance = value
  emit()
}

export function subscribeBalance(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Record settle-result totalWin for UI hold-back animation.
 * @param {string | number | null | undefined} roundId
 * @param {number} amount
 */
export function noteCreditedWin(roundId, amount) {
  if (roundId == null) return
  const key = String(roundId)
  const next = amount > 0 ? roundMoney(amount) : 0
  creditedWins.set(key, next)
}

/**
 * Win amount already noted for this round (0 when none).
 * @param {string | number | null | undefined} roundId
 * @returns {number}
 */
export function creditedWinFor(roundId) {
  if (roundId == null) return 0
  return creditedWins.get(String(roundId)) ?? 0
}

/** @returns {number} */
export function useBalance() {
  return useSyncExternalStore(subscribeBalance, getBalance, getBalance)
}
