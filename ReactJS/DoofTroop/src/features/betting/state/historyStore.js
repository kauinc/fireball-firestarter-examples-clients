import { useSyncExternalStore } from 'react'
import { winnersFromRound } from '../../settlement/utils/settlementFromRound.js'
import { fetchRecentResultRounds } from '../../../shared/supabase/rounds.js'

/** Max visible race rows in the History panel. */
export const HISTORY_MAX_ROWS = 10

/**
 * @typedef {{
 *   id: string,
 *   places: Record<'1st' | '2nd' | '3rd', string | null>,
 *   sortKey: number,
 * }} HistoryRow
 * `sortKey` — round `created_at` ms for fetched rows, insert time for rows
 * committed locally from settlement (always the newest).
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

function emit() {
  snapshot = Object.freeze({ rows, anim })
  for (const listener of listeners) listener()
}

function getSnapshot() {
  return snapshot
}

function freezeRow(r) {
  return Object.freeze({
    id: r.id,
    places: Object.freeze({ ...r.places }),
    sortKey: r.sortKey,
  })
}

/**
 * @param {ReadonlyArray<Record<string, unknown>>} rounds
 * @returns {HistoryRow[]}
 */
function rowsFromRounds(rounds) {
  const next = []
  for (const round of rounds ?? []) {
    if (next.length >= HISTORY_MAX_ROWS) break
    const winners = winnersFromRound(round)
    if (!winners) continue
    const createdMs =
      typeof round.created_at === 'string' ? Date.parse(round.created_at) : NaN
    next.push(
      freezeRow(
        historyRowFromWinners(
          String(round.id),
          winners,
          Number.isFinite(createdMs) ? createdMs : 0,
        ),
      ),
    )
  }
  return next
}

/**
 * Replace / merge history with finished Supabase rounds (newest first).
 * Safe during an in-progress insert: keeps the inserting (+ exiting) row(s)
 * and fills the rest so reload mid-race does not show an empty sheet until
 * podium doofs land.
 *
 * @param {ReadonlyArray<Record<string, unknown>>} rounds
 */
export function hydrateHistoryFromRounds(rounds) {
  const fetched = rowsFromRounds(rounds)
  if (fetched.length === 0 && rows.length === 0) return

  const insertingId = anim.phase === 'inserting' ? anim.insertingId : null
  const exitingId = anim.phase === 'inserting' ? anim.exitingId : null
  const insertingRow = insertingId
    ? rows.find((r) => r.id === insertingId)
    : null
  const exitingRow = exitingId ? rows.find((r) => r.id === exitingId) : null

  const fetchedIds = new Set(fetched.map((r) => r.id))
  const localExtras = rows.filter(
    (r) =>
      r.id !== insertingId &&
      r.id !== exitingId &&
      !fetchedIds.has(r.id),
  )
  const fetchedRest = fetched.filter((r) => r.id !== insertingId)

  const body = [...localExtras, ...fetchedRest]
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, HISTORY_MAX_ROWS - (insertingRow ? 1 : 0))

  rows = [
    ...(insertingRow ? [insertingRow] : []),
    ...body,
    ...(exitingRow ? [exitingRow] : []),
  ].map(freezeRow)

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
  if (rows.some((r) => r.id === result.id)) {
    // Refresh icons in place (e.g. corrected placements) — no new row.
    replaceRowPlaces(result)
    return {
      insertingId: result.id,
      exitingId: anim.exitingId,
      alreadyPresent: true,
    }
  }

  const next = [freezeRow(result), ...rows]
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
}

/**
 * @param {{ id: string, places: Record<string, string | null> }} result
 */
function replaceRowPlaces(result) {
  const index = rows.findIndex((r) => r.id === result.id)
  if (index < 0) return
  const current = rows[index]
  const samePlaces = ['1st', '2nd', '3rd'].every(
    (place) => current.places[place] === (result.places[place] ?? null),
  )
  if (samePlaces) return
  rows = rows.map((r, i) =>
    i === index ? freezeRow({ ...r, places: result.places }) : r,
  )
  emit()
}

/**
 * Commit a settled round without animation (portrait, or settlement HUD
 * cleared before the fly-in could run). Existing rows get their icons
 * refreshed; new rows go on top, below any in-progress insert.
 *
 * @param {HistoryRow} result
 */
export function commitHistoryRow(result) {
  if (rows.some((r) => r.id === result.id)) {
    replaceRowPlaces(result)
    return
  }
  const insertingIndex =
    anim.phase === 'inserting'
      ? rows.findIndex((r) => r.id === anim.insertingId)
      : -1
  const at = insertingIndex + 1
  rows = [...rows.slice(0, at), freezeRow(result), ...rows.slice(at)].slice(
    0,
    HISTORY_MAX_ROWS + (anim.phase === 'inserting' && anim.exitingId ? 1 : 0),
  )
  emit()
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
 * @param {number} [sortKey] - round `created_at` ms; defaults to now (newest)
 * @returns {HistoryRow}
 */
export function historyRowFromWinners(roundId, winners, sortKey = Date.now()) {
  const places = { '1st': null, '2nd': null, '3rd': null }
  for (const w of winners ?? []) {
    if (w.place === '1st' || w.place === '2nd' || w.place === '3rd') {
      places[w.place] = w.src ?? null
    }
  }
  return {
    id: `round-${roundId}`,
    places,
    sortKey,
  }
}
