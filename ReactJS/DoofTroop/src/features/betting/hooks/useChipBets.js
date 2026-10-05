import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adjustBalance } from '../state/balanceStore.js'
import {
  getCarryForwardBets,
  markCarryForwardCharged,
  wasCarryForwardCharged,
} from '../state/carryForwardBetsStore.js'
import {
  getLastRoundBets,
  hasLastRoundBets,
  setLastRoundBets,
} from '../state/lastRoundBetsStore.js'
import {
  getRoundBetsSnapshot,
  publishRoundBets,
} from '../state/roundBetsStore.js'
import { MAX_BET_PER_TARGET } from '../constants/doofs.js'
import { positionsForMetal, positionsForChips } from '../constants/positions.js'
import { betTargetKey } from '../utils/betTargets.js'
import {
  mergeMetalChips,
  mergeComboChips,
  isComboBarTarget,
  roundMoney,
  stackTotal,
} from '../utils/chipMath.js'

function exceedsMaxBet(bets) {
  return bets.some((bet) => stackTotal(bet.chips) > MAX_BET_PER_TARGET)
}

function betsStakeTotal(bets) {
  return roundMoney(bets.reduce((sum, bet) => sum + stackTotal(bet.chips), 0))
}

const MAX_UNDO = 40

let betSeq = 0

function nextBetId() {
  betSeq += 1
  return `bet-${betSeq}`
}

function cloneBets(bets) {
  return bets.map((bet) => ({
    ...bet,
    chips: bet.chips.map((chip) => ({ ...chip })),
    positions: [...bet.positions],
    target: { ...bet.target },
  }))
}

/**
 * Re-seed previous settlement winners onto a fresh betting session.
 * @param {string | null | undefined} roundId
 */
function seedBetsFromCarryForward(roundId) {
  const carry = getCarryForwardBets(roundId)
  if (!carry?.bets?.length) return []
  return carry.bets.map((bet) => ({
    id: nextBetId(),
    key: bet.key,
    chips: (bet.chips ?? []).map((chip) => ({ ...chip })),
    positions: [...(bet.positions ?? [])],
    target: bet.target ? { ...bet.target } : bet.target,
  }))
}

/** Archive the published board when a new betting round mounts (before first paint). */
function archivePublishedBoardForRepeat(roundId) {
  const published = getRoundBetsSnapshot()
  if (
    published.roundId == null ||
    roundId == null ||
    String(published.roundId) === String(roundId)
  ) {
    return
  }
  setLastRoundBets({
    fromRoundId: published.roundId,
    bets: published.bets,
    comboPick: published.comboPick,
    crazyComboPicks: published.crazyComboPicks,
  })
}

function cloneTarget(target) {
  return { ...target }
}

function mergeChipsForTarget(target, chips) {
  return isComboBarTarget(target) ? mergeComboChips(chips) : mergeMetalChips(chips)
}

/**
 * Local chip placements. Max 3 faces per stack (silver / gold / bronze);
 * placing the same metal again adds to that face instead of stacking another.
 * Combo / Crazy Combo bars merge every metal into one stake.
 * Remount the consumer with `key={roundId}` to clear bets for a new round.
 * Winning bets from the previous settlement are re-seeded onto the new board.
 *
 * Metal selects paytable scope: gold=WINNER/1st, silver=TOP 2, bronze=TOP 3.
 *
 * UNDO — pops the last board mutation (place / clear / repeat / x2).
 * REPEAT LAST — clears the board, then restores the previous round's full bet set.
 */
export function useChipBets(
  _selectedPositions,
  roundId = null,
  crazyCombo = false,
  comboPick = null,
  crazyComboPicks = null,
) {
  const [bets, setBets] = useState(() => {
    // Capture previous round's board before this session publishes over it.
    archivePublishedBoardForRepeat(roundId)
    return seedBetsFromCarryForward(roundId)
  })
  const [canUndo, setCanUndo] = useState(false)
  const canRepeat = hasLastRoundBets()
  const undoStackRef = useRef([])
  const betsRef = useRef(bets)

  const totalBet = useMemo(
    () => roundMoney(bets.reduce((sum, bet) => sum + stackTotal(bet.chips), 0)),
    [bets],
  )

  // Re-stake carried winning chips once per new betting round.
  useEffect(() => {
    if (wasCarryForwardCharged(roundId)) return
    const stake = betsStakeTotal(betsRef.current)
    if (!(stake > 0)) {
      markCarryForwardCharged(roundId)
      return
    }
    if (!adjustBalance(-stake)) {
      // Can't afford to leave them — clear the board.
      betsRef.current = []
      setBets([])
      markCarryForwardCharged(roundId)
      return
    }
    markCarryForwardCharged(roundId)
  }, [roundId])

  useEffect(() => {
    publishRoundBets(roundId, bets, { crazyCombo, comboPick, crazyComboPicks })
  }, [roundId, bets, crazyCombo, comboPick, crazyComboPicks])

  const applyBets = useCallback((next) => {
    betsRef.current = next
    setBets(next)
  }, [])

  /**
   * Apply board mutation and sync wallet: stake up → spend, stake down → refund.
   * @returns {boolean}
   */
  const commitBets = useCallback(
    (next) => {
      const prevTotal = betsStakeTotal(betsRef.current)
      const nextTotal = betsStakeTotal(next)
      const delta = roundMoney(nextTotal - prevTotal)
      if (delta !== 0 && !adjustBalance(-delta)) return false
      applyBets(next)
      return true
    },
    [applyBets],
  )

  const pushUndo = useCallback((snapshot) => {
    const stack = undoStackRef.current
    stack.push(cloneBets(snapshot))
    if (stack.length > MAX_UNDO) stack.shift()
    setCanUndo(true)
  }, [])

  const buildPlacedBets = useCallback((prev, amount, target, metal) => {
    const key = betTargetKey(target)
    const stakeMetal = isComboBarTarget(target) ? 'gold' : metal
    const addition = [{ metal: stakeMetal, value: amount }]
    const existing = prev.find((bet) => bet.key === key)
    if (existing) {
      return prev.map((bet) => {
        if (bet.key !== key) return bet
        const chips = mergeChipsForTarget(target, [...bet.chips, ...addition])
        return {
          ...bet,
          chips,
          positions: [...positionsForChips(chips)],
        }
      })
    }
    const chips = mergeChipsForTarget(target, addition)
    return [
      ...prev,
      {
        id: nextBetId(),
        key,
        chips,
        target: cloneTarget(target),
        positions: [...positionsForMetal(stakeMetal)],
      },
    ]
  }, [])

  const placeBet = useCallback(
    (amount, target, metal = 'gold') => {
      if (!amount || !target || !metal) return false
      const prev = betsRef.current
      const next = buildPlacedBets(prev, amount, target, metal)
      if (exceedsMaxBet(next)) return false
      const prevTotal = betsStakeTotal(prev)
      const nextTotal = betsStakeTotal(next)
      const delta = roundMoney(nextTotal - prevTotal)
      if (delta !== 0 && !adjustBalance(-delta)) return false
      pushUndo(prev)
      applyBets(next)
      return true
    },
    [applyBets, buildPlacedBets, pushUndo],
  )

  const clearBets = useCallback(() => {
    const prev = betsRef.current
    if (!prev.length) return false
    pushUndo(prev)
    commitBets([])
    return true
  }, [commitBets, pushUndo])

  const clearBetsByTargetType = useCallback(
    (type) => {
      if (!type) return false
      const prev = betsRef.current
      const next = prev.filter((bet) => bet.target?.type !== type)
      if (next.length === prev.length) return false
      pushUndo(prev)
      commitBets(next)
      return true
    },
    [commitBets, pushUndo],
  )

  const undoBets = useCallback(() => {
    const previous = undoStackRef.current.pop()
    if (!previous) {
      setCanUndo(false)
      return false
    }
    if (!commitBets(previous)) {
      undoStackRef.current.push(previous)
      return false
    }
    setCanUndo(undoStackRef.current.length > 0)
    return true
  }, [commitBets])

  const repeatLastBets = useCallback(() => {
    const last = getLastRoundBets()
    if (!last?.bets?.length) return false

    const prev = betsRef.current
    const next = last.bets.map((bet) => ({
      id: nextBetId(),
      key: bet.key,
      chips: (bet.chips ?? []).map((chip) => ({ ...chip })),
      positions: [...(bet.positions ?? [])],
      target: bet.target ? { ...bet.target } : bet.target,
    }))

    if (exceedsMaxBet(next)) return false
    // Replace the board in one commit (refund current stake, charge last round).
    if (!commitBets(next)) return false
    pushUndo(prev)
    return true
  }, [commitBets, pushUndo])

  const doubleBets = useCallback(() => {
    const prev = betsRef.current
    if (!prev.length) return false
    const next = prev.map((bet) => ({
      ...bet,
      chips: mergeChipsForTarget(
        bet.target,
        bet.chips.map((chip) => ({
          ...chip,
          value: roundMoney(chip.value * 2),
        })),
      ),
    }))
    if (exceedsMaxBet(next)) return false
    const prevTotal = betsStakeTotal(prev)
    const nextTotal = betsStakeTotal(next)
    const delta = roundMoney(nextTotal - prevTotal)
    if (delta !== 0 && !adjustBalance(-delta)) return false
    pushUndo(prev)
    applyBets(next)
    return true
  }, [applyBets, pushUndo])

  return {
    bets,
    totalBet,
    canUndo,
    canRepeat,
    placeBet,
    clearBets,
    clearBetsByTargetType,
    undoBets,
    repeatLastBets,
    doubleBets,
  }
}
