import { useSyncExternalStore } from 'react'
import { URL_PARAMS } from 'fireball-fireworks-sdk-client'
import { getDoofFireball } from '../../../shared/fireball/client.js'
import { usesCfWallet } from '../../../shared/fireball/gameMode.js'

/**
 * @typedef {import('fireball-fireworks-sdk-client').Transaction} FireballTransaction
 */

/** @type {FireballTransaction[]} */
let transactions = []
let loading = false
let error = null
let hasMore = true
let startIndex = 0
/** @type {FireballTransaction | null} */
let selected = null
/** @type {Record<string, unknown> | null} */
let replayGameState = null
let replayOpen = false
let replayLoading = false
let replayError = null

let snapshot = freezeSnapshot()

const listeners = new Set()
const PAGE_SIZE_HINT = 20

function freezeSnapshot() {
  return Object.freeze({
    transactions,
    loading,
    error,
    hasMore,
    selected,
    replayGameState,
    replayOpen,
    replayLoading,
    replayError,
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
 * Prefer the latest non-empty GameState on the transaction.
 * @param {FireballTransaction | null | undefined} tx
 * @returns {Record<string, unknown> | null}
 */
export function gameStateFromTransaction(tx) {
  const states = tx?.GameStates ?? []
  for (let i = states.length - 1; i >= 0; i -= 1) {
    const parsed =
      typeof states[i]?.parseGameState === 'function'
        ? states[i].parseGameState()
        : null
    if (parsed) return parsed
  }
  return null
}

export function subscribeTransactions(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getTransactionsSnapshot() {
  return snapshot
}

export function useTransactions() {
  return useSyncExternalStore(
    subscribeTransactions,
    getSnapshot,
    getSnapshot,
  )
}

export function clearTransactions() {
  transactions = []
  loading = false
  error = null
  hasMore = true
  startIndex = 0
  selected = null
  replayGameState = null
  replayOpen = false
  replayLoading = false
  replayError = null
  emit()
}

/**
 * @param {{ reset?: boolean }} [options]
 */
export async function loadTransactions({ reset = false } = {}) {
  if (!usesCfWallet()) {
    error = null
    transactions = []
    hasMore = false
    emit()
    return
  }

  if (loading) return

  const fireball = getDoofFireball()
  if (!fireball.isAuth) {
    error = 'not_authorized'
    emit()
    return
  }

  if (reset) {
    startIndex = 0
    hasMore = true
    transactions = []
  }

  if (!hasMore && !reset) return

  loading = true
  error = null
  emit()

  try {
    const list = await fireball.getTransactionsList({
      startIndex,
      includeGameStates: true,
    })
    const page = list?.Transactions ?? []
    transactions = reset ? page : [...transactions, ...page]
    startIndex = transactions.length
    hasMore = page.length >= PAGE_SIZE_HINT
    loading = false
    emit()
  } catch (e) {
    loading = false
    error = e?.message ?? String(e)
    emit()
  }
}

/**
 * Open read-only replay from a transaction (uses embedded gameStates when present).
 * @param {FireballTransaction} tx
 */
export async function openReplayFromTransaction(tx) {
  if (!tx) return
  selected = tx
  replayError = null
  const embedded = gameStateFromTransaction(tx)
  if (embedded) {
    replayGameState = embedded
    replayOpen = true
    replayLoading = false
    emit()
    return
  }

  if (!tx.ReplayId) {
    replayError = 'missing_replay'
    replayOpen = false
    emit()
    return
  }

  await openReplayById(tx.ReplayId)
}

/**
 * Fetch replay by short / full id (deep-link or tap without embedded state).
 * @param {string} shortReplayId
 */
export async function openReplayById(shortReplayId) {
  const id = String(shortReplayId ?? '').trim()
  if (!id) return

  if (!usesCfWallet()) {
    replayError = 'fun_mode'
    emit()
    return
  }

  const fireball = getDoofFireball()
  if (!fireball.isAuth) {
    replayError = 'not_authorized'
    emit()
    return
  }

  replayLoading = true
  replayError = null
  replayOpen = true
  emit()

  try {
    const replays = await fireball.getReplaysList(id)
    const tx = replays?.[0] ?? null
    selected = tx
    const gs = gameStateFromTransaction(tx)
    if (!gs) {
      replayGameState = null
      replayError = 'empty_game_state'
      replayLoading = false
      emit()
      return
    }
    replayGameState = gs
    replayLoading = false
    emit()
  } catch (e) {
    replayLoading = false
    replayError = e?.message ?? String(e)
    emit()
  }
}

export function closeReplay() {
  replayOpen = false
  replayLoading = false
  replayError = null
  replayGameState = null
  selected = null
  emit()
}

/**
 * After auth: if launch URL has ?replay=, open ReplayOverlay once.
 * @returns {Promise<boolean>} true when a deep-link was handled
 */
export async function tryOpenReplayDeepLink() {
  if (!usesCfWallet()) return false
  const fireball = getDoofFireball()
  const shortId =
    fireball.session?.extra?.[URL_PARAMS.REPLAY] ??
    fireball.session?.extra?.replay
  if (!shortId) return false
  await openReplayById(String(shortId))
  return true
}
