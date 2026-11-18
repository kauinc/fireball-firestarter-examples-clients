import { useSyncExternalStore } from 'react'
import { emptyCrazyComboPicks } from '../../features/betting/constants/combo.js'
import { publishRoundBets } from '../../features/betting/state/roundBetsStore.js'
import {
  noteCreditedWin,
  setBalance,
} from '../../features/betting/state/balanceStore.js'
import { balanceFromRgs } from './client.js'
import { WalletPhase } from './messages.js'
import {
  field,
  normalizeBet,
  normalizeComboPick,
  normalizeCrazyComboPicks,
  normalizeSettlementResult,
} from './normalize.js'

export { WalletPhase }

const EMPTY_BETS = Object.freeze([])

let snapshot = Object.freeze({
  roundId: null,
  bets: EMPTY_BETS,
  comboPick: null,
  crazyComboPicks: emptyCrazyComboPicks(),
  totalStake: 0,
  walletPhase: WalletPhase.Idle,
  lockedBets: EMPTY_BETS,
  canUndo: false,
  lastSettlement: null,
  lastSettlementRoundId: null,
  lastError: null,
  lastRefund: null,
  busy: false,
})

const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

function publishBoard() {
  publishRoundBets(snapshot.roundId, snapshot.bets, {
    crazyCombo: true,
    comboPick: snapshot.comboPick,
    crazyComboPicks: snapshot.crazyComboPicks,
  })
}

/**
 * @param {Partial<typeof snapshot>} patch
 */
function commit(patch) {
  snapshot = Object.freeze({ ...snapshot, ...patch })
  emit()
}

export function getCfGameSnapshot() {
  return snapshot
}

export function subscribeCfGame(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCfGameState() {
  return useSyncExternalStore(subscribeCfGame, getCfGameSnapshot, getCfGameSnapshot)
}

export function setCfBusy(busy) {
  if (snapshot.busy === Boolean(busy)) return
  commit({ busy: Boolean(busy) })
}

export function clearCfError() {
  if (!snapshot.lastError) return
  commit({ lastError: null })
}

/**
 * Restore pending/locked board from auth GameState.
 * @param {Record<string, unknown> | null | undefined} gameState
 * @param {unknown} [authBalanceCents]
 */
export function hydrateFromGameState(gameState, authBalanceCents = null) {
  if (authBalanceCents != null) {
    setBalance(balanceFromRgs(authBalanceCents))
  }
  if (!gameState || typeof gameState !== 'object') return

  const balanceCents = field(gameState, 'Balance', 'balance')
  if (balanceCents != null) {
    setBalance(balanceFromRgs(balanceCents))
  }

  const roundId = field(gameState, 'CurrentRoundId', 'currentRoundId')
  const walletPhase =
    field(gameState, 'WalletPhase', 'walletPhase') ?? WalletPhase.Idle
  const pending = (field(gameState, 'PendingBets', 'pendingBets') ?? [])
    .map(normalizeBet)
    .filter(Boolean)
  const locked = (field(gameState, 'LockedBets', 'lockedBets') ?? [])
    .map(normalizeBet)
    .filter(Boolean)
  const bets =
    walletPhase === WalletPhase.Locked || walletPhase === WalletPhase.Settled
      ? locked.length > 0
        ? locked
        : pending
      : pending

  const undoStack = field(gameState, 'UndoStack', 'undoStack')
  const lastSettlementRaw = field(gameState, 'LastSettlement', 'lastSettlement')
  const lastSettlement = lastSettlementRaw
    ? normalizeSettlementResult(lastSettlementRaw)
    : null

  commit({
    roundId: roundId != null ? String(roundId) : null,
    bets: Object.freeze(bets),
    lockedBets: Object.freeze(locked),
    comboPick: normalizeComboPick(field(gameState, 'ComboPick', 'comboPick')),
    crazyComboPicks: normalizeCrazyComboPicks(
      field(gameState, 'CrazyComboPicks', 'crazyComboPicks'),
    ),
    totalStake: Number(
      field(gameState, 'TotalStake', 'totalStake') ??
        bets.reduce(
          (sum, bet) =>
            sum +
            (bet.chips ?? []).reduce((s, c) => s + Number(c.value || 0), 0),
          0,
        ),
    ),
    walletPhase: String(walletPhase),
    canUndo: Array.isArray(undoStack) && undoStack.length > 0,
    lastSettlement,
    lastSettlementRoundId: lastSettlement?.roundId
      ? String(lastSettlement.roundId)
      : roundId != null
        ? String(roundId)
        : null,
    lastError: null,
  })
  publishBoard()

  if (lastSettlement?.totalWin != null && lastSettlement.roundId != null) {
    noteCreditedWin(lastSettlement.roundId, lastSettlement.totalWin)
  }
}

/**
 * @param {Record<string, unknown>} message
 */
export function applyBetsUpdated(message) {
  const bets = (field(message, 'Bets', 'bets') ?? [])
    .map(normalizeBet)
    .filter(Boolean)
  const roundId = field(message, 'RoundId', 'roundId')
  const totalStake = Number(field(message, 'TotalStake', 'totalStake') ?? 0)
  const walletPhase =
    field(message, 'WalletPhase', 'walletPhase') ?? WalletPhase.Pending
  const comboPick = normalizeComboPick(field(message, 'ComboPick', 'comboPick'))
  const crazyComboPicks = normalizeCrazyComboPicks(
    field(message, 'CrazyComboPicks', 'crazyComboPicks'),
  )

  commit({
    roundId: roundId != null ? String(roundId) : snapshot.roundId,
    bets: Object.freeze(bets),
    comboPick,
    crazyComboPicks,
    totalStake: roundMoneySafe(totalStake),
    walletPhase: String(walletPhase),
    lastError: null,
  })
  publishBoard()
}

/**
 * @param {Record<string, unknown>} message
 */
export function applyBetsLocked(message) {
  const bets = (field(message, 'Bets', 'bets') ?? [])
    .map(normalizeBet)
    .filter(Boolean)
  const roundId = field(message, 'RoundId', 'roundId')
  const totalStake = Number(field(message, 'TotalStake', 'totalStake') ?? 0)
  const walletPhase =
    field(message, 'WalletPhase', 'walletPhase') ?? WalletPhase.Locked
  const balanceCents = field(message, 'Balance', 'balance')
  if (balanceCents != null) {
    setBalance(balanceFromRgs(balanceCents))
  }

  commit({
    roundId: roundId != null ? String(roundId) : snapshot.roundId,
    bets: Object.freeze(bets),
    lockedBets: Object.freeze(bets),
    totalStake: roundMoneySafe(totalStake),
    walletPhase: String(walletPhase),
    canUndo: false,
    lastError: null,
  })
  publishBoard()
}

/**
 * @param {Record<string, unknown>} message
 */
export function applySettleResult(message) {
  const walletPhase =
    field(message, 'WalletPhase', 'walletPhase') ?? WalletPhase.Settled
  const balanceCents = field(message, 'Balance', 'balance')
  if (balanceCents != null) {
    setBalance(balanceFromRgs(balanceCents))
  }

  const settlementRaw = field(message, 'Settlement', 'settlement')
  const settlement = normalizeSettlementResult(settlementRaw)
  const roundId =
    settlement?.roundId != null
      ? String(settlement.roundId)
      : snapshot.roundId

  if (settlement && roundId) {
    noteCreditedWin(roundId, settlement.totalWin)
  }

  commit({
    walletPhase: String(walletPhase),
    lastSettlement: settlement,
    lastSettlementRoundId: roundId,
    lastError: null,
  })
}

/**
 * @param {Record<string, unknown>} message
 */
export function applyRefundResult(message) {
  const walletPhase =
    field(message, 'WalletPhase', 'walletPhase') ?? WalletPhase.Refunded
  const balanceCents = field(message, 'Balance', 'balance')
  if (balanceCents != null) {
    setBalance(balanceFromRgs(balanceCents))
  }
  const roundId = field(message, 'RoundId', 'roundId')
  const refundedStake = Number(
    field(message, 'RefundedStake', 'refundedStake') ?? 0,
  )

  commit({
    walletPhase: String(walletPhase),
    bets: EMPTY_BETS,
    lockedBets: EMPTY_BETS,
    totalStake: 0,
    canUndo: false,
    lastRefund: Object.freeze({
      roundId: roundId != null ? String(roundId) : null,
      refundedStake: roundMoneySafe(refundedStake),
    }),
    lastError: null,
  })
  publishBoard()
}

/**
 * @param {{ Name?: string, name?: string, Reason?: string, reason?: string, Balance?: unknown, balance?: unknown }} error
 */
export function applyCfError(error) {
  const name = String(field(error, 'Name', 'name') ?? 'error')
  const reason = String(field(error, 'Reason', 'reason') ?? 'Request failed')
  const balanceCents = field(error, 'Balance', 'balance')
  if (balanceCents != null) {
    setBalance(balanceFromRgs(balanceCents))
  }

  // Only wipe the board on operator PlaceBet reject (lock path), not on
  // in-game edit rejects (max bet, closed betting, etc.).
  const lockReject =
    snapshot.walletPhase === WalletPhase.Locking ||
    /bet placement rejected|place-bet was rejected|bets were rejected for this round/i.test(
      reason,
    )

  if (lockReject) {
    commit({
      walletPhase: WalletPhase.Rejected,
      bets: EMPTY_BETS,
      lockedBets: EMPTY_BETS,
      totalStake: 0,
      canUndo: false,
      lastError: Object.freeze({ name, reason }),
    })
    publishBoard()
    return
  }

  commit({
    lastError: Object.freeze({ name, reason }),
  })
}

export function markUndoAvailable(canUndo) {
  if (snapshot.canUndo === Boolean(canUndo)) return
  commit({ canUndo: Boolean(canUndo) })
}

function roundMoneySafe(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.round(v * 100) / 100
}
