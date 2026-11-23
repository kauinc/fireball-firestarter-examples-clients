/**
 * Fun-mode local wallet — mirrors CF BettingHandler / Lock / Settle without RGS.
 * Mutates the shared cfGameStore so HUD / race / settlement keep working.
 */

import { emptyCrazyComboPicks } from '../constants/combo.js'
import { positionsForMetal } from '../constants/positions.js'
import { betTargetKey } from '../utils/betTargets.js'
import { cloneBet, cloneBets } from '../utils/cloneBet.js'
import {
  isComboBarTarget,
  mergeComboChips,
  mergeMetalChips,
  roundMoney,
  stackTotal,
} from '../utils/chipMath.js'
import { getBalance, noteCreditedWin, setBalance } from '../state/balanceStore.js'
import { getMaxBetPerTarget } from '../state/chipLadderStore.js'
import { getLastRoundBets, setLastRoundBets } from '../state/lastRoundBetsStore.js'
import { settlementFromRound } from '../../settlement/utils/settlementFromRound.js'
import {
  applyBetsLocked,
  applyBetsUpdated,
  applyRefundResult,
  applySettleResult,
  getCfGameSnapshot,
  markUndoAvailable,
} from '../../../shared/fireball/cfGameStore.js'
import { WalletPhase } from '../../../shared/fireball/messages.js'
import { balanceToRgs } from '../../../shared/fireball/client.js'

const MAX_UNDO = 40

/** @type {Array<{ bets: object[], comboPick: unknown, crazyComboPicks: unknown }>} */
let undoStack = []
let betSequence = 0

function mergeChipsForTarget(target, chips) {
  return isComboBarTarget(target)
    ? mergeComboChips(chips)
    : mergeMetalChips(chips)
}

function betsStakeTotal(bets) {
  return roundMoney(
    (bets ?? []).reduce((sum, bet) => sum + stackTotal(bet.chips ?? []), 0),
  )
}

function pushUndo(snap) {
  undoStack.push({
    bets: cloneBets(snap.bets),
    comboPick: snap.comboPick ? { ...snap.comboPick } : null,
    crazyComboPicks: { ...(snap.crazyComboPicks ?? emptyCrazyComboPicks()) },
  })
  if (undoStack.length > MAX_UNDO) undoStack.shift()
}

function nextBetId() {
  betSequence += 1
  return `local-${betSequence}`
}

function publishPending(roundId, bets, comboPick, crazyComboPicks) {
  applyBetsUpdated({
    RoundId: roundId,
    Bets: bets,
    ComboPick: comboPick,
    CrazyComboPicks: crazyComboPicks,
    TotalStake: betsStakeTotal(bets),
    WalletPhase: WalletPhase.Pending,
  })
  markUndoAvailable(undoStack.length > 0)
}

/**
 * Reset local undo when a new round starts.
 * @param {string} roundId
 */
export function localResetRound(roundId) {
  undoStack = []
  const snap = getCfGameSnapshot()
  if (String(snap.roundId ?? '') !== String(roundId)) {
    publishPending(roundId, [], null, emptyCrazyComboPicks())
  }
  markUndoAvailable(false)
}

/**
 * @param {{
 *   roundId: string,
 *   target: object,
 *   metal?: string,
 *   chipValue: number,
 *   positions?: string[],
 * }} args
 */
export function localPlaceChip({
  roundId,
  target,
  metal = 'gold',
  chipValue,
  positions,
}) {
  if (!roundId || !target || !(chipValue > 0)) {
    return { ok: false, reason: 'Invalid chip.' }
  }

  const snap = getCfGameSnapshot()
  const sameRound = String(snap.roundId ?? '') === String(roundId)
  const bets = sameRound ? cloneBets(snap.bets) : []
  const comboPick = sameRound ? snap.comboPick : null
  const crazyComboPicks = sameRound
    ? { ...(snap.crazyComboPicks ?? emptyCrazyComboPicks()) }
    : emptyCrazyComboPicks()

  if (target.type === 'combo' && !comboPick) {
    return { ok: false, reason: 'Combo pick is required before placing a combo bet.' }
  }
  if (target.type === 'crazyCombo') {
    const picks = crazyComboPicks
    const complete = ['1st', '2nd', '3rd'].every((p) => picks?.[p])
    if (!complete) {
      return { ok: false, reason: 'Crazy combo picks are incomplete.' }
    }
  }

  pushUndo({ bets, comboPick, crazyComboPicks })

  const key = betTargetKey(target)
  let existing = bets.find((b) => b.key === key)
  const stakeMetal =
    target.type === 'combo' || target.type === 'crazyCombo' ? 'gold' : metal

  if (!existing) {
    existing = {
      id: nextBetId(),
      key,
      target: { ...target },
      positions: positions?.length
        ? [...positions]
        : [...positionsForMetal(stakeMetal)],
      chips: [],
    }
    bets.push(existing)
  }

  const chips = [...(existing.chips ?? []), { metal: stakeMetal, value: chipValue, count: 1 }]
  existing.chips = mergeChipsForTarget(existing.target, chips)
  existing.positions = isComboBarTarget(existing.target)
    ? ['1st', '2nd', '3rd']
    : [
        ...new Set(
          existing.chips.flatMap((c) => [...positionsForMetal(c.metal)]),
        ),
      ]

  const max = getMaxBetPerTarget()
  if (stackTotal(existing.chips) > max) {
    undoStack.pop()
    return { ok: false, reason: `Max bet per target is ${max}.` }
  }

  const total = betsStakeTotal(bets)
  if (total > getBalance()) {
    undoStack.pop()
    return { ok: false, reason: 'Insufficient balance.' }
  }

  publishPending(roundId, bets, comboPick, crazyComboPicks)
  return { ok: true }
}

/**
 * @param {{ roundId: string, betId: string, metal?: string | null }} args
 */
export function localRemoveChip({ roundId, betId, metal = null }) {
  const snap = getCfGameSnapshot()
  if (String(snap.roundId ?? '') !== String(roundId)) {
    return { ok: false }
  }
  const bets = cloneBets(snap.bets)
  const idx = bets.findIndex((b) => b.id === betId)
  if (idx < 0) return { ok: false }

  pushUndo({
    bets: snap.bets,
    comboPick: snap.comboPick,
    crazyComboPicks: snap.crazyComboPicks,
  })

  const bet = bets[idx]
  if (metal) {
    bet.chips = (bet.chips ?? []).filter((c) => c.metal !== metal)
  } else {
    bet.chips = []
  }

  if ((bet.chips?.length ?? 0) === 0) {
    bets.splice(idx, 1)
  }

  publishPending(roundId, bets, snap.comboPick, snap.crazyComboPicks)
  return { ok: true }
}

/** @param {string} roundId */
export function localClearBets(roundId) {
  const snap = getCfGameSnapshot()
  if (String(snap.roundId ?? '') !== String(roundId)) return { ok: false }
  if (!(snap.bets?.length > 0)) return { ok: false }

  pushUndo({
    bets: snap.bets,
    comboPick: snap.comboPick,
    crazyComboPicks: snap.crazyComboPicks,
  })
  publishPending(roundId, [], null, emptyCrazyComboPicks())
  return { ok: true }
}

/** @param {string} roundId */
export function localDoubleBets(roundId) {
  const snap = getCfGameSnapshot()
  if (String(snap.roundId ?? '') !== String(roundId)) return { ok: false }
  if (!(snap.bets?.length > 0)) return { ok: false }

  const max = getMaxBetPerTarget()
  const bets = cloneBets(snap.bets).map((bet) => ({
    ...bet,
    chips: mergeChipsForTarget(
      bet.target,
      (bet.chips ?? []).map((c) => ({
        ...c,
        value: roundMoney(c.value * 2),
      })),
    ),
  }))

  if (bets.some((b) => stackTotal(b.chips) > max)) {
    return { ok: false, reason: `Doubling would exceed max bet ${max}.` }
  }
  if (betsStakeTotal(bets) > getBalance()) {
    return { ok: false, reason: 'Insufficient balance.' }
  }

  pushUndo({
    bets: snap.bets,
    comboPick: snap.comboPick,
    crazyComboPicks: snap.crazyComboPicks,
  })
  publishPending(roundId, bets, snap.comboPick, snap.crazyComboPicks)
  return { ok: true }
}

/** @param {string} roundId */
export function localRepeatLast(roundId) {
  const last = getLastRoundBets()
  if (!last?.bets?.length) return { ok: false }

  const snap = getCfGameSnapshot()
  const bets = cloneBets(last.bets).map((b) => ({
    ...b,
    id: nextBetId(),
  }))
  const max = getMaxBetPerTarget()
  if (bets.some((b) => stackTotal(b.chips) > max)) {
    return { ok: false, reason: 'Repeated bets exceed max per target.' }
  }
  if (betsStakeTotal(bets) > getBalance()) {
    return { ok: false, reason: 'Insufficient balance.' }
  }

  pushUndo({
    bets: snap.bets,
    comboPick: snap.comboPick,
    crazyComboPicks: snap.crazyComboPicks,
  })
  publishPending(
    roundId,
    bets,
    last.comboPick ?? null,
    last.crazyComboPicks ?? emptyCrazyComboPicks(),
  )
  return { ok: true }
}

/** @param {string} roundId */
export function localUndoBets(roundId) {
  if (undoStack.length === 0) return { ok: false }
  const prev = undoStack.pop()
  publishPending(
    roundId,
    prev.bets,
    prev.comboPick,
    prev.crazyComboPicks,
  )
  return { ok: true }
}

/**
 * @param {string} roundId
 * @param {unknown} comboPick
 */
export function localSetComboPick(roundId, comboPick) {
  const snap = getCfGameSnapshot()
  pushUndo({
    bets: snap.bets,
    comboPick: snap.comboPick,
    crazyComboPicks: snap.crazyComboPicks,
  })
  publishPending(
    roundId,
    String(snap.roundId) === String(roundId) ? cloneBets(snap.bets) : [],
    comboPick,
    snap.crazyComboPicks ?? emptyCrazyComboPicks(),
  )
  return { ok: true }
}

/**
 * @param {string} roundId
 * @param {Record<string, unknown>} crazyComboPicks
 */
export function localSetCrazyComboPicks(roundId, crazyComboPicks) {
  const snap = getCfGameSnapshot()
  pushUndo({
    bets: snap.bets,
    comboPick: snap.comboPick,
    crazyComboPicks: snap.crazyComboPicks,
  })
  publishPending(
    roundId,
    String(snap.roundId) === String(roundId) ? cloneBets(snap.bets) : [],
    snap.comboPick,
    crazyComboPicks ?? emptyCrazyComboPicks(),
  )
  return { ok: true }
}

/**
 * @param {{
 *   roundId: string,
 *   bets: object[],
 *   comboPick?: unknown,
 *   crazyComboPicks?: unknown,
 * }} args
 */
export function localCarryForward({
  roundId,
  bets,
  comboPick = null,
  crazyComboPicks = null,
}) {
  const snap = getCfGameSnapshot()
  const next = cloneBets(bets).map((b) => ({ ...b, id: nextBetId() }))
  const max = getMaxBetPerTarget()
  if (next.some((b) => stackTotal(b.chips) > max)) {
    return { ok: false, reason: 'Carry-forward exceeds max bet per target.' }
  }
  if (betsStakeTotal(next) > getBalance()) {
    return { ok: false, reason: 'Insufficient balance.' }
  }

  pushUndo({
    bets: snap.bets,
    comboPick: snap.comboPick,
    crazyComboPicks: snap.crazyComboPicks,
  })
  publishPending(
    roundId,
    next,
    comboPick,
    crazyComboPicks ?? emptyCrazyComboPicks(),
  )
  return { ok: true }
}

/**
 * Lock pending bets and debit balance (no PlaceBet).
 * @param {string} roundId
 */
export function localLockBets(roundId) {
  const snap = getCfGameSnapshot()
  if (String(snap.roundId ?? '') !== String(roundId)) {
    return { ok: false, reason: 'No pending bets for this round.' }
  }
  if (
    snap.walletPhase === WalletPhase.Locked ||
    snap.walletPhase === WalletPhase.Settled
  ) {
    return { ok: true }
  }

  const bets = cloneBets(snap.bets)
  if (bets.length === 0) {
    return { ok: false, reason: 'No pending bets to lock.' }
  }

  const totalStake = betsStakeTotal(bets)
  const balance = getBalance()
  if (totalStake > balance) {
    return { ok: false, reason: 'Insufficient balance.' }
  }

  setBalance(roundMoney(balance - totalStake))
  undoStack = []

  applyBetsLocked({
    RoundId: roundId,
    Bets: bets,
    TotalStake: totalStake,
    WalletPhase: WalletPhase.Locked,
    Balance: balanceToRgs(getBalance()),
  })
  return { ok: true }
}

/**
 * Settle locked bets against podium using client paytable.
 * @param {string} roundId
 * @param {Record<string, unknown>} round
 */
export function localSettleRound(roundId, round) {
  const snap = getCfGameSnapshot()
  if (
    snap.walletPhase === WalletPhase.Settled ||
    snap.walletPhase === WalletPhase.Refunded
  ) {
    return { ok: true }
  }

  const locked =
    (snap.lockedBets?.length ?? 0) > 0
      ? cloneBets(snap.lockedBets)
      : cloneBets(snap.bets)

  if (locked.length === 0) {
    applySettleResult({
      WalletPhase: WalletPhase.Settled,
      Balance: balanceToRgs(getBalance()),
      Settlement: {
        RoundId: roundId,
        TotalWin: 0,
        DidWin: false,
        WinCount: 0,
        ById: {},
        Winners: [],
      },
    })
    return { ok: true }
  }

  // Ensure locked if somehow still pending.
  if (snap.walletPhase !== WalletPhase.Locked) {
    const lock = localLockBets(roundId)
    if (!lock.ok) return lock
  }

  const afterLock = getCfGameSnapshot()
  const bets =
    (afterLock.lockedBets?.length ?? 0) > 0
      ? cloneBets(afterLock.lockedBets)
      : locked

  const settlement = settlementFromRound(round, {
    bets,
    comboPick: afterLock.comboPick,
    crazyComboPicks: afterLock.crazyComboPicks,
  })

  const totalWin = settlement?.totalWin ?? 0
  if (totalWin > 0) {
    setBalance(roundMoney(getBalance() + totalWin))
    noteCreditedWin(roundId, totalWin)
  }

  setLastRoundBets({
    fromRoundId: roundId,
    bets,
    comboPick: afterLock.comboPick,
    crazyComboPicks: afterLock.crazyComboPicks,
  })

  const byId = {}
  for (const [id, o] of Object.entries(settlement?.outcomes?.byId ?? {})) {
    byId[id] = {
      Won: o.won,
      Stake: o.stake,
      Payout: o.payout,
    }
  }

  applySettleResult({
    WalletPhase: WalletPhase.Settled,
    Balance: balanceToRgs(getBalance()),
    Settlement: {
      RoundId: roundId,
      TotalWin: totalWin,
      DidWin: Boolean(settlement?.didWin),
      WinCount: settlement?.winCount ?? 0,
      Winners: (settlement?.winners ?? []).map((w) => ({
        Place: w.place,
        Color: w.color,
        Pattern: w.pattern,
        DoofIndex: w.doofIndex,
      })),
      ById: byId,
    },
  })
  return { ok: true }
}

/**
 * Cancel / refund locked stake.
 * @param {string} roundId
 */
export function localCancelRound(roundId) {
  const snap = getCfGameSnapshot()
  const stake =
    snap.walletPhase === WalletPhase.Locked
      ? Number(snap.totalStake ?? 0)
      : betsStakeTotal(snap.bets)

  if (snap.walletPhase === WalletPhase.Locked && stake > 0) {
    setBalance(roundMoney(getBalance() + stake))
  }

  undoStack = []
  applyRefundResult({
    RoundId: roundId,
    WalletPhase: WalletPhase.Refunded,
    Balance: balanceToRgs(getBalance()),
    RefundedStake: stake,
  })
  return { ok: true }
}
