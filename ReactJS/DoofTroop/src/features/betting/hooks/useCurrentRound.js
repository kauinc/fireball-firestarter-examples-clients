import { useSyncExternalStore } from 'react'
import {
  fetchLatestRound,
  shouldApplyRound,
  subscribeToRounds,
} from '../../../shared/supabase/rounds.js'
import {
  noteServerClockSample,
  syncServerClockFromHttpDate,
} from '../../../shared/supabase/roundTimestamps.js'
import { ensureHistoryHydrated } from '../state/historyStore.js'
import { getRoundBetsSnapshot } from '../state/roundBetsStore.js'
import { reconcileRoundWallet } from '../state/walletReconcile.js'

/**
 * Anchor client↔server clock from a Realtime row only.
 * REST snapshots must not sample `updated_at`: a stamp even 1–2s old is
 * treated as “server now” and the betting timer gains those seconds after reload.
 *
 * @param {Record<string, unknown> | null | undefined} row
 */
function syncServerClockFromRealtime(row) {
  if (!row) return
  const clientNow = Date.now()
  const raceUpdated = row.race_updated_at
  const updated = row.updated_at
  const raceMs =
    typeof raceUpdated === 'string' ? Date.parse(raceUpdated) : NaN
  const updatedMs = typeof updated === 'string' ? Date.parse(updated) : NaN

  let stamp = updated
  if (
    Number.isFinite(raceMs) &&
    (!Number.isFinite(updatedMs) || raceMs >= updatedMs)
  ) {
    stamp = raceUpdated
  }

  noteServerClockSample(stamp, clientNow, { force: true })
}

/**
 * Shared round snapshot for all overlays (one fetch + one Realtime subscription).
 */

const SERVER_SNAPSHOT = Object.freeze({
  round: null,
  status: null,
  ready: false,
  error: null,
  realtimeStatus: 'INIT',
})

let snapshot = SERVER_SNAPSHOT
const listeners = new Set()
let started = false
let stopRealtime = null
/** Monotonic generation so stale `loadLatest` responses cannot overwrite newer state. */
let fetchGeneration = 0
/**
 * HTTP `Date` sync runs once per page: on reconnects it would override the
 * finer-grained Realtime samples with a second-resolution stamp.
 */
let httpClockSynced = false

function emit(next) {
  snapshot = Object.freeze(next)
  for (const listener of listeners) listener()
}

function applyRound(data, { fromRealtime = false } = {}) {
  const prev = snapshot.round
  if (!shouldApplyRound(data, prev)) {
    // Rejected rows are stale (out-of-order / older version) — their
    // `updated_at` is not "server now", so never sample the clock here.
    if (!snapshot.ready || snapshot.error) {
      emit({
        ...snapshot,
        ready: true,
        error: null,
      })
    }
    return
  }
  if (fromRealtime) syncServerClockFromRealtime(data)
  emit({
    ...snapshot,
    round: data,
    status: typeof data?.status === 'string' ? data.status : null,
    ready: true,
    error: null,
  })
  // Wallet follows round lifecycle even if settlement UI never mounts.
  reconcileRoundWallet(data, getRoundBetsSnapshot())
}

async function loadLatest() {
  const generation = ++fetchGeneration
  // Align client↔server before reading deadlines (fixes +1–2s after reload).
  if (!httpClockSynced) {
    httpClockSynced = await syncServerClockFromHttpDate()
    if (generation !== fetchGeneration) return
  }

  const { data, error: queryError } = await fetchLatestRound()
  if (generation !== fetchGeneration) return

  if (queryError) {
    console.error('[rounds] fetch failed', queryError.message)
    emit({
      ...snapshot,
      ready: true,
      error: queryError.message,
    })
    return
  }
  // REST row stamps may be seconds old — do not sample them as “server now”.
  applyRound(data, { fromRealtime: false })
}

function ensureStarted() {
  if (started) return
  started = true

  loadLatest()
  // History panel is unmounted during race — hydrate here so reload mid-race
  // still has prior rows before settlement insert animation.
  ensureHistoryHydrated()

  let hasSubscribed = false
  const { unsubscribe } = subscribeToRounds(
    ({ eventType, new: next }) => {
      // DELETE delivers `new: {}` — refetch the latest row instead.
      if (!next?.id) {
        loadLatest()
        return
      }
      if (import.meta.env.DEV) {
        console.debug('[rounds] realtime', {
          eventType,
          status: next.status,
          presentation_phase: next.presentation_phase ?? null,
          placements: next.placements ?? null,
          finisher_times_ms: next.finisher_times_ms ?? null,
          race_elapsed_ms: next.race_elapsed_ms ?? null,
          race_updated_at: next.race_updated_at ?? null,
          results_recorded_at: next.results_recorded_at ?? null,
          podium_transition_started_at:
            next.podium_transition_started_at ?? null,
          podium_entered_at: next.podium_entered_at ?? null,
          finished_at: next.finished_at ?? null,
          betting_deadline: next.betting_deadline ?? null,
          created_at: next.created_at ?? null,
          updated_at: next.updated_at ?? null,
          round_version: next.round_version ?? null,
        })
      }
      // Realtime row was just written — `updated_at` ≈ server now.
      applyRound(next, { fromRealtime: true })
    },
    (status, err) => {
      if (snapshot.realtimeStatus !== status) {
        emit({ ...snapshot, realtimeStatus: status })
      }
      if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        console.error('[rounds] realtime', status, err?.message || err)
        loadLatest()
      } else if (status === 'SUBSCRIBED') {
        // Rows written while the channel was down are not replayed.
        if (hasSubscribed) loadLatest()
        hasSubscribed = true
        if (import.meta.env.DEV) console.debug('[rounds] realtime subscribed')
      }
    },
  )

  stopRealtime = unsubscribe
}

function subscribe(listener) {
  listeners.add(listener)
  ensureStarted()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && stopRealtime) {
      stopRealtime()
      stopRealtime = null
      started = false
      // Drop in-flight fetches so they cannot write after teardown.
      fetchGeneration += 1
    }
  }
}

function getSnapshot() {
  return snapshot
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT
}

/**
 * Current round from Supabase `rounds`:
 * - one shared initial fetch
 * - Realtime INSERT/UPDATE
 * Safe to call from multiple overlays — multiplexed via this store.
 */
export function useCurrentRound() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
