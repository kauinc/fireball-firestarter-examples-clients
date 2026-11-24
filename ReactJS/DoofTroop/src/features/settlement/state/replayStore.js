import { useSyncExternalStore } from 'react'
import { URL_PARAMS } from 'fireball-fireworks-sdk-client'
import { getDoofFireball } from '../../../shared/fireball/client.js'
import {
  gameStateFromTransaction,
  replayViewFromGameState,
} from '../utils/replayFromGameState.js'

/**
 * @typedef {import('fireball-fireworks-sdk-client').Transaction} FireballTransaction
 */

/** @type {FireballTransaction[]} */
let transactions = []
let index = 0
let loading = false
let error = null
let active = false
let shortId = null

let snapshot = freezeSnapshot()
const listeners = new Set()

function freezeSnapshot() {
  const tx = transactions[index] ?? null
  const gameState = gameStateFromTransaction(tx)
  return Object.freeze({
    active,
    loading,
    error,
    shortId,
    transactions,
    index,
    transaction: tx,
    view: replayViewFromGameState(gameState),
    hasPrev: index < transactions.length - 1,
    hasNext: index > 0,
  })
}

function emit() {
  snapshot = freezeSnapshot()
  for (const listener of listeners) listener()
}

function getSnapshot() {
  return snapshot
}

/**
 * Read `?replay=` from the launch URL (before or after Fireball init).
 * @returns {string | null}
 */
export function readReplayIdFromUrl() {
  if (typeof window === 'undefined') return null
  try {
    const sp = new URLSearchParams(window.location.search)
    const id = sp.get(URL_PARAMS.REPLAY) || sp.get('replay')
    return id ? String(id).trim() : null
  } catch {
    return null
  }
}

export function isReplayLaunch() {
  return Boolean(readReplayIdFromUrl())
}

export function subscribeReplay(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getReplaySnapshot() {
  return snapshot
}

export function useReplay() {
  return useSyncExternalStore(subscribeReplay, getSnapshot, getSnapshot)
}

/**
 * Load replay collection by short id (admin link).
 * @param {string} [idHint]
 */
export async function openReplayById(idHint) {
  const fromSession = (() => {
    try {
      const extra = getDoofFireball()?.session?.extra
      return extra?.[URL_PARAMS.REPLAY] ?? extra?.replay
    } catch {
      return null
    }
  })()

  const id = String(idHint || fromSession || readReplayIdFromUrl() || '').trim()
  if (!id) {
    error = 'missing_replay'
    active = true
    emit()
    return
  }

  // Admin links are often `...?replay=shortId` only. GET /sessions/replay/{id}
  // is public — do not gate on money/coins mode or auth (that caused false
  // "Replay unavailable" when launch defaulted to fun).
  const fireball = getDoofFireball()

  active = true
  shortId = id
  loading = true
  error = null
  emit()

  try {
    const list = await fireball.getReplaysList(id)
    transactions = Array.isArray(list) ? list : []
    // Collection shortId ≠ per-round ReplayId — default to first (newest) item.
    const match = transactions.findIndex((tx) => tx.ReplayId === id)
    index = match >= 0 ? match : 0
    if (transactions.length === 0) {
      error = 'empty_collection'
    } else if (!gameStateFromTransaction(transactions[index])) {
      // Bet/win may exist without SaveGameStateForReplay snapshots.
      error = 'empty_game_state'
      console.warn(
        '[DoofTroop replay] collection loaded but GameStates empty — CF SaveGameStateForReplay missing for this round?',
        {
          shortId: id,
          count: transactions.length,
          replayId: transactions[index]?.ReplayId,
          bet: transactions[index]?.Bet,
          win: transactions[index]?.Win,
          gameStates: transactions[index]?.GameStates?.length ?? 0,
        },
      )
    } else {
      error = null
    }
    loading = false
    emit()
  } catch (e) {
    loading = false
    error = e?.message ?? String(e)
    console.error('[DoofTroop replay] getReplaysList failed', error)
    emit()
  }
}

/** Older transaction in the collection (toward end of newest-first list). */
export function replayPrev() {
  if (index >= transactions.length - 1) return
  index += 1
  emit()
}

/** Newer transaction in the collection. */
export function replayNext() {
  if (index <= 0) return
  index -= 1
  emit()
}
