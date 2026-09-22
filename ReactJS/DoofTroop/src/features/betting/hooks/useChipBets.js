import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { publishRoundBets } from '../state/roundBetsStore.js'
import { betTargetKey } from '../utils/betTargets.js'
import {
  mergeMetalChips,
  mergeComboChips,
  isComboBarTarget,
  roundMoney,
  stackTotal,
} from '../utils/chipMath.js'

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
 *
 * UNDO — pops the last board mutation (place / clear / repeat / x2).
 * REPEAT LAST — re-applies the most recent chip placement (same target/metal/amount).
 */
export function useChipBets(
  selectedPositions,
  roundId = null,
  crazyCombo = false,
  comboPick = null,
  crazyComboPicks = null,
) {
  const [bets, setBets] = useState([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRepeat, setCanRepeat] = useState(false)
  const undoStackRef = useRef([])
  /** @type {React.MutableRefObject<{ amount: number, target: Record<string, unknown>, metal: string } | null>} */
  const lastPlacementRef = useRef(null)
  const betsRef = useRef(bets)

  const totalBet = useMemo(
    () => roundMoney(bets.reduce((sum, bet) => sum + stackTotal(bet.chips), 0)),
    [bets],
  )

  useEffect(() => {
    publishRoundBets(roundId, bets, { crazyCombo, comboPick, crazyComboPicks })
  }, [roundId, bets, crazyCombo, comboPick, crazyComboPicks])

  const applyBets = useCallback((next) => {
    betsRef.current = next
    setBets(next)
  }, [])

  const pushUndo = useCallback((snapshot) => {
    const stack = undoStackRef.current
    stack.push(cloneBets(snapshot))
    if (stack.length > MAX_UNDO) stack.shift()
    setCanUndo(true)
  }, [])

  const buildPlacedBets = useCallback(
    (prev, amount, target, metal) => {
      const key = betTargetKey(target)
      const positions = [...selectedPositions]
      const stakeMetal = isComboBarTarget(target) ? 'gold' : metal
      const addition = [{ metal: stakeMetal, value: amount }]
      const existing = prev.find((bet) => bet.key === key)
      if (existing) {
        return prev.map((bet) => {
          if (bet.key !== key) return bet
          return {
            ...bet,
            chips: mergeChipsForTarget(target, [...bet.chips, ...addition]),
            positions,
          }
        })
      }
      return [
        ...prev,
        {
          id: nextBetId(),
          key,
          chips: mergeChipsForTarget(target, addition),
          target: cloneTarget(target),
          positions,
        },
      ]
    },
    [selectedPositions],
  )

  const placeBet = useCallback(
    (amount, target, metal = 'gold') => {
      if (!amount || !target || !metal) return false
      const prev = betsRef.current
      pushUndo(prev)
      lastPlacementRef.current = {
        amount,
        target: cloneTarget(target),
        metal,
      }
      setCanRepeat(true)
      applyBets(buildPlacedBets(prev, amount, target, metal))
      return true
    },
    [applyBets, buildPlacedBets, pushUndo],
  )

  const clearBets = useCallback(() => {
    const prev = betsRef.current
    if (!prev.length) return false
    pushUndo(prev)
    applyBets([])
    return true
  }, [applyBets, pushUndo])

  const undoBets = useCallback(() => {
    const previous = undoStackRef.current.pop()
    if (!previous) {
      setCanUndo(false)
      return false
    }
    setCanUndo(undoStackRef.current.length > 0)
    applyBets(previous)
    return true
  }, [applyBets])

  const repeatLastBets = useCallback(() => {
    const last = lastPlacementRef.current
    if (!last) {
      setCanRepeat(false)
      return false
    }
    return placeBet(last.amount, last.target, last.metal)
  }, [placeBet])

  const doubleBets = useCallback(() => {
    const prev = betsRef.current
    if (!prev.length) return false
    pushUndo(prev)
    applyBets(
      prev.map((bet) => ({
        ...bet,
        chips: mergeChipsForTarget(
          bet.target,
          bet.chips.map((chip) => ({
            ...chip,
            value: roundMoney(chip.value * 2),
          })),
        ),
      })),
    )
    return true
  }, [applyBets, pushUndo])

  return {
    bets,
    totalBet,
    canUndo,
    canRepeat,
    placeBet,
    clearBets,
    undoBets,
    repeatLastBets,
    doubleBets,
  }
}
