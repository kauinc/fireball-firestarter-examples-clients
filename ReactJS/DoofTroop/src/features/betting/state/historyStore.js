import { useSyncExternalStore } from 'react'
import { winnersFromPlacements } from '../../settlement/utils/settlementFromRound.js'
import { fetchRecentResultRounds } from '../../../shared/supabase/rounds.js'

/** Max visible race rows in the History panel. */
export const HISTORY_MAX_ROWS = 10

/**
 * @typedef {{
 *   id: string,
 *   places: Record<'1st' | '2nd' | '3rd', string | null>,
 * }} HistoryRow
 */

/** @type {HistoryRow[]} newest first — empty until Supabase hydrate (or settlement insert). */
let rows = []

/** @type {{ phase: 'idle' | 'inserting', insertingId: string | null, exitingId: string | null }} */
let anim = Object.freeze({
  phase: 'idle',
  insertingId: null,
  exitingId: null,
})

/** Cached for useSyncExternalStore — must be referentially stable until emit(). */
let snapshot = Object.freeze({ rows, anim })

const listeners = new Set()

let hydrateStarted = false
/** @type {ReadonlyArray<Record<string, unknown>> | null} */
let pendingHydrateRounds = null

function emit() {
  snapshot = Object.freeze({ rows, anim })
  for (const listener of listeners) listener()
}

function getSnapshot() {
  return snapshot
}

/**
 * Replace empty history with real finished rounds (newest first).
 * @param {ReadonlyArray<Record<string, unknown>>} rounds
 */
export function hydrateHistoryFromRounds(rounds) {
  if (anim.phase === 'inserting') {
    pendingHydrateRounds = rounds
    return
  }

  const next = []
  for (const round of rounds ?? []) {
    if (next.length >= HISTORY_MAX_ROWS) break
    const winners = winnersFromPlacements(round?.placements)
    if (!winners) continue
    next.push(
      Object.freeze(
        historyRowFromWinners(String(round.id ?? round.round_number), winners),
      ),
    )
  }

  if (next.length === 0) return

  // Keep any newer settlement-inserted rows that aren't in the fetch yet.
  const fetchedIds = new Set(next.map((r) => r.id))
  const newerLocal = rows.filter((r) => !fetchedIds.has(r.id))
  rows = [...newerLocal, ...next]
    .slice(0, HISTORY_MAX_ROWS)
    .map((r) =>
      Object.freeze({ id: r.id, places: Object.freeze({ ...r.places }) }),
    )
  pendingHydrateRounds = null
  emit()
}

async function hydrateFromSupabase() {
  const { data, error } = await fetchRecentResultRounds(HISTORY_MAX_ROWS)
  if (error) {
    console.error('[history] fetch failed', error.message)
    // Allow a later subscribe / ensureHistoryHydrated call to retry.
    hydrateStarted = false
    return
  }
  hydrateHistoryFromRounds(data)
}

/** Kick off one-shot history load from finished Supabase rounds. */
export function ensureHistoryHydrated() {
  if (hydrateStarted) return
  hydrateStarted = true
  hydrateFromSupabase()
}

/**
 * Begin insert animation: newest row on top (icons may land later),
 * keep one exiting overflow row until `finishHistoryInsert`.
 *
 * @param {{
 *   id: string,
 *   places: Record<'1st' | '2nd' | '3rd', string | null>,
 * }} result
 */
export function beginHistoryInsert(result) {
  if (rows[0]?.id === result.id) {
    return {
      insertingId: result.id,
      exitingId: anim.exitingId,
      alreadyPresent: true,
    }
  }

  const next = [
    Object.freeze({
      id: result.id,
      places: Object.freeze({ ...result.places }),
    }),
    ...rows,
  ]
  const exiting = next.length > HISTORY_MAX_ROWS ? next[HISTORY_MAX_ROWS] : null
  rows = next.slice(0, HISTORY_MAX_ROWS + (exiting ? 1 : 0))
  anim = Object.freeze({
    phase: 'inserting',
    insertingId: result.id,
    exitingId: exiting?.id ?? null,
  })
  emit()
  return { insertingId: result.id, exitingId: exiting?.id ?? null }
}

/** Trim overflow row and clear anim flags after CSS finishes. */
export function finishHistoryInsert() {
  rows = rows.slice(0, HISTORY_MAX_ROWS)
  anim = Object.freeze({
    phase: 'idle',
    insertingId: null,
    exitingId: null,
  })
  emit()

  if (pendingHydrateRounds) {
    const queued = pendingHydrateRounds
    pendingHydrateRounds = null
    hydrateHistoryFromRounds(queued)
  }
}

/**
 * Undo an in-progress insert (e.g. effect cleanup / Strict Mode remount).
 * @param {string} insertingId
 */
export function cancelHistoryInsert(insertingId) {
  if (anim.phase !== 'inserting' || anim.insertingId !== insertingId) return
  rows = rows.filter((r) => r.id !== insertingId).slice(0, HISTORY_MAX_ROWS)
  anim = Object.freeze({
    phase: 'idle',
    insertingId: null,
    exitingId: null,
  })
  emit()

  if (pendingHydrateRounds) {
    const queued = pendingHydrateRounds
    pendingHydrateRounds = null
    hydrateHistoryFromRounds(queued)
  }
}

export function subscribeHistory(listener) {
  listeners.add(listener)
  ensureHistoryHydrated()
  return () => listeners.delete(listener)
}

export function useRaceHistory() {
  return useSyncExternalStore(subscribeHistory, getSnapshot, getSnapshot)
}

/**
 * Build a history row from settlement podium winners.
 * @param {string} roundId
 * @param {ReadonlyArray<{ place: string, src?: string | null }>} winners
 */
export function historyRowFromWinners(roundId, winners) {
  const places = { '1st': null, '2nd': null, '3rd': null }
  for (const w of winners ?? []) {
    if (w.place === '1st' || w.place === '2nd' || w.place === '3rd') {
      places[w.place] = w.src ?? null
    }
  }
  return {
    id: `round-${roundId}`,
    places,
  }
}
