import { useSyncExternalStore } from 'react'
import { emptyCrazyComboPicks } from '../constants/combo.js'
import { cloneBet } from '../utils/cloneBet.js'

/**
 * Full chip board from the previous betting round — used by Repeat Last.
 * Survives BettingRoundSession remount (`key={roundId}`).
 * Only non-empty boards overwrite the archive (empty rounds keep the prior set).
 */

/** @type {{
 *   fromRoundId: string | null,
 *   bets: ReadonlyArray<Record<string, unknown>>,
 *   comboPick: { kind: string, key: string } | null,
 *   crazyComboPicks: Record<string, { color: string, pattern: string } | null>,
 * } | null} */
let lastRound = null
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

/**
 * @param {{
 *   fromRoundId?: string | null,
 *   bets?: ReadonlyArray<Record<string, unknown>>,
 *   comboPick?: { kind: string, key: string } | null,
 *   crazyComboPicks?: Record<string, { color: string, pattern: string } | null>,
 * }} payload
 */
export function setLastRoundBets(payload = {}) {
  const bets = Array.isArray(payload.bets) ? payload.bets : []
  // Keep the previous archive when the departing round had no chips.
  if (bets.length === 0) return

  lastRound = {
    fromRoundId:
      payload.fromRoundId != null ? String(payload.fromRoundId) : null,
    bets: Object.freeze(bets.map(cloneBet)),
    comboPick: payload.comboPick ? { ...payload.comboPick } : null,
    crazyComboPicks: Object.freeze({
      ...(payload.crazyComboPicks ?? emptyCrazyComboPicks()),
    }),
  }
  emit()
}

/** @returns {typeof lastRound} */
export function getLastRoundBets() {
  return lastRound
}

export function hasLastRoundBets() {
  return Boolean(lastRound?.bets?.length)
}

export function subscribeLastRoundBets(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Reactive: true when Repeat Last has a non-empty prior board. */
export function useCanRepeatLastBets() {
  return useSyncExternalStore(
    subscribeLastRoundBets,
    hasLastRoundBets,
    hasLastRoundBets,
  )
}
