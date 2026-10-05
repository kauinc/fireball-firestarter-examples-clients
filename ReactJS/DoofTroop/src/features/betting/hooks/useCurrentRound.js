import { useSyncExternalStore } from 'react'
import {
  fetchLatestRound,
  shouldApplyRound,
  subscribeToRounds,
} from '../../../shared/supabase/rounds.js'
import { ensureHistoryHydrated } from '../state/historyStore.js'

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

function emit(next) {
  snapshot = Object.freeze(next)
  for (const listener of listeners) listener()
}

function applyRound(data) {
  const prev = snapshot.round
  if (!shouldApplyRound(data, prev)) {
    emit({
      ...snapshot,
      ready: true,
      error: null,
    })
    return
  }
  emit({
    ...snapshot,
    round: data,
    status: typeof data?.status === 'string' ? data.status : null,
    ready: true,
    error: null,
  })
}

async function loadLatest() {
  const generation = ++fetchGeneration
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
  applyRound(data)
}

function ensureStarted() {
  if (started) return
  started = true

  loadLatest()
  ensureHistoryHydrated()

  const { unsubscribe } = subscribeToRounds(
    ({ eventType, new: next }) => {
      if (!next) {
        loadLatest()
        return
      }
      if (import.meta.env.DEV) {
        console.debug('[rounds] realtime', {
          eventType,
          status: next.status,
          round_number: next.round_number,
          placements: next.placements ?? null,
          winner_doof_index: next.winner_doof_index ?? null,
          created_at: next.created_at ?? null,
          updated_at: next.updated_at ?? null,
          race_started_at: next.race_started_at ?? null,
          betting_closed_at: next.betting_closed_at ?? null,
        })
      }
      applyRound(next)
    },
    (status, err) => {
      emit({ ...snapshot, realtimeStatus: status })
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('[rounds] realtime', status, err?.message || err)
        loadLatest()
      } else if (status === 'SUBSCRIBED' && import.meta.env.DEV) {
        console.debug('[rounds] realtime subscribed')
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
