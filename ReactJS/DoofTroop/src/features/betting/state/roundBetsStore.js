import { useSyncExternalStore } from 'react'
import { emptyCrazyComboPicks } from '../constants/combo.js'
import { setLastRoundBets } from './lastRoundBetsStore.js'

/**
 * Last chip placements for the active round.
 * Survives BettingOverlay UI hide so RaceOverlay can show a read-only board.
 */
let snapshot = Object.freeze({
  roundId: null,
  bets: Object.freeze([]),
  crazyCombo: false,
  comboPick: null,
  crazyComboPicks: emptyCrazyComboPicks(),
})
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

/**
 * @param {string | null | undefined} roundId
 * @param {Array<Record<string, unknown>>} bets
 * @param {{ crazyCombo?: boolean, comboPick?: { kind: string, key: string } | null, crazyComboPicks?: Record<string, { color: string, pattern: string } | null> }} [meta]
 */
export function publishRoundBets(roundId, bets, meta = {}) {
  const nextRoundId = roundId ?? null
  const prevRoundId = snapshot.roundId
  // Archive the previous round's board for Repeat Last before overwriting.
  // Empty boards are ignored inside setLastRoundBets (keeps prior archive).
  if (
    prevRoundId != null &&
    nextRoundId != null &&
    prevRoundId !== nextRoundId
  ) {
    setLastRoundBets({
      fromRoundId: prevRoundId,
      bets: snapshot.bets,
      comboPick: snapshot.comboPick,
      crazyComboPicks: snapshot.crazyComboPicks,
    })
  }

  snapshot = Object.freeze({
    roundId: nextRoundId,
    bets: Object.freeze([...(bets ?? [])]),
    crazyCombo: Boolean(meta.crazyCombo),
    comboPick: meta.comboPick ?? null,
    crazyComboPicks: Object.freeze({
      ...(meta.crazyComboPicks ?? emptyCrazyComboPicks()),
    }),
  })
  emit()
}

export function getRoundBetsSnapshot() {
  return snapshot
}

export function subscribeRoundBets(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function hasComboBet(bets) {
  return bets?.some((bet) => bet.target?.type === 'combo') ?? false
}

export function hasCrazyComboBet(bets) {
  return bets?.some((bet) => bet.target?.type === 'crazyCombo') ?? false
}

/**
 * Combo / Crazy Combo bars are always shown on race CURRENT BETS + settlement.
 * Kept as a helper for call sites that previously gated on chip placement.
 * @param {{ bets?: ReadonlyArray<Record<string, unknown>> }} [_state]
 */
export function shouldShowRaceCrazyCombos(_state) {
  return true
}

/** @returns {{ roundId: string | null, bets: ReadonlyArray<Record<string, unknown>>, crazyCombo: boolean, comboPick: { kind: string, key: string } | null, crazyComboPicks: Record<string, { color: string, pattern: string } | null> }} */
export function usePublishedRoundBets() {
  return useSyncExternalStore(
    subscribeRoundBets,
    getRoundBetsSnapshot,
    getRoundBetsSnapshot,
  )
}
