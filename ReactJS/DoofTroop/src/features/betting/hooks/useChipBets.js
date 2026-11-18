import { useCallback, useEffect, useRef } from 'react'
import {
  clearCarryForwardSeed,
  markCarryForwardCharged,
  wasCarryForwardCharged,
} from '../state/carryForwardBetsStore.js'
import { useCanRepeatLastBets } from '../state/lastRoundBetsStore.js'
import { getBalance } from '../state/balanceStore.js'
import { MAX_BET_PER_TARGET } from '../constants/doofs.js'
import { emptyCrazyComboPicks } from '../constants/combo.js'
import { positionsForMetal } from '../constants/positions.js'
import { betTargetKey } from '../utils/betTargets.js'
import { roundMoney, stackTotal } from '../utils/chipMath.js'
import {
  getCfGameSnapshot,
  markUndoAvailable,
  useCfGameState,
} from '../../../shared/fireball/cfGameStore.js'
import {
  cfCarryForward,
  cfClearBets,
  cfDoubleBets,
  cfPlaceChip,
  cfRemoveChip,
  cfRepeatLast,
  cfSetComboPick,
  cfSetCrazyComboPicks,
  cfUndoBets,
} from '../../../shared/fireball/cfRequests.js'

function exceedsMaxBet(bets) {
  return bets.some((bet) => stackTotal(bet.chips) > MAX_BET_PER_TARGET)
}

function betsStakeTotal(bets) {
  return roundMoney(bets.reduce((sum, bet) => sum + stackTotal(bet.chips), 0))
}

/**
 * CF-backed chip placements. Board / totals come from bets-updated.
 * Remount with `key={roundId}` for a new round session.
 *
 * @param {unknown} _selectedPositions
 * @param {string | null} [roundId]
 * @param {boolean} [crazyCombo]
 * @param {{ kind: string, key: string } | null} [comboPick]
 * @param {Record<string, { color: string, pattern: string } | null> | null} [crazyComboPicks]
 * @param {{ carry?: { bets?: ReadonlyArray<Record<string, unknown>>, comboPick?: unknown, crazyComboPicks?: unknown } | null, onCarryForwardRejected?: () => void, onUndoMeta?: (meta: { comboPick: unknown, crazyComboPicks: unknown }) => void, onPicksFromServer?: (meta: { comboPick: unknown, crazyComboPicks: unknown }) => void }} [options]
 */
export function useChipBets(
  _selectedPositions,
  roundId = null,
  crazyCombo = false,
  comboPick = null,
  crazyComboPicks = null,
  options = {},
) {
  const {
    carry = null,
    onCarryForwardRejected,
    onUndoMeta,
    onPicksFromServer,
  } = options
  const cf = useCfGameState()
  const canRepeat = useCanRepeatLastBets()
  const onCarryForwardRejectedRef = useRef(onCarryForwardRejected)
  const onUndoMetaRef = useRef(onUndoMeta)
  const onPicksFromServerRef = useRef(onPicksFromServer)
  const comboPickRef = useRef(comboPick)
  const crazyComboPicksRef = useRef(crazyComboPicks)

  useEffect(() => {
    comboPickRef.current = comboPick
  }, [comboPick])
  useEffect(() => {
    crazyComboPicksRef.current = crazyComboPicks
  }, [crazyComboPicks])
  useEffect(() => {
    onCarryForwardRejectedRef.current = onCarryForwardRejected
  }, [onCarryForwardRejected])
  useEffect(() => {
    onUndoMetaRef.current = onUndoMeta
  }, [onUndoMeta])
  useEffect(() => {
    onPicksFromServerRef.current = onPicksFromServer
  }, [onPicksFromServer])

  // Sync combo / crazy picks from CF into overlay local state.
  useEffect(() => {
    if (roundId == null) return
    if (String(cf.roundId ?? '') !== String(roundId)) return
    onPicksFromServerRef.current?.({
      comboPick: cf.comboPick,
      crazyComboPicks: cf.crazyComboPicks ?? emptyCrazyComboPicks(),
    })
  }, [roundId, cf.roundId, cf.comboPick, cf.crazyComboPicks])

  const sameRound =
    roundId != null &&
    cf.roundId != null &&
    String(cf.roundId) === String(roundId)

  const bets = sameRound ? cf.bets : []
  const totalBet = sameRound ? cf.totalStake : 0
  const canUndo = sameRound ? cf.canUndo : false
  const carryRejected = Boolean(
    cf.lastError && /carry/i.test(cf.lastError.reason ?? ''),
  )

  // Carry-forward via CF once per round.
  useEffect(() => {
    if (!roundId || wasCarryForwardCharged(roundId)) return
    if (!carry?.bets?.length) {
      markCarryForwardCharged(roundId)
      return
    }

    let cancelled = false
    ;(async () => {
      const stake = betsStakeTotal(carry.bets)
      if (stake > getBalance()) {
        clearCarryForwardSeed(roundId)
        onCarryForwardRejectedRef.current?.()
        markCarryForwardCharged(roundId)
        return
      }
      const { ok } = await cfCarryForward({
        roundId,
        bets: carry.bets,
        comboPick: carry.comboPick ?? null,
        crazyComboPicks: carry.crazyComboPicks ?? emptyCrazyComboPicks(),
      })
      if (cancelled) return
      markCarryForwardCharged(roundId)
      if (!ok) {
        clearCarryForwardSeed(roundId)
        onCarryForwardRejectedRef.current?.()
      } else {
        markUndoAvailable(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [roundId, carry])

  const placeBet = useCallback(
    async (amount, target, metal = 'gold') => {
      if (!roundId || !amount || !target || !metal) return false
      const key = betTargetKey(target)
      const existing = getCfGameSnapshot().bets.find((bet) => bet.key === key)
      const current = existing ? stackTotal(existing.chips) : 0
      if (roundMoney(current + amount) > MAX_BET_PER_TARGET) return false

      const nextStake = roundMoney(
        betsStakeTotal(getCfGameSnapshot().bets) + amount,
      )
      if (nextStake > getBalance()) return false

      const stakeMetal = target?.type === 'combo' || target?.type === 'crazyCombo'
        ? 'gold'
        : metal
      const { ok } = await cfPlaceChip({
        roundId,
        target,
        metal: stakeMetal,
        chipValue: amount,
        positions: [...positionsForMetal(stakeMetal)],
      })
      if (ok) markUndoAvailable(true)
      return ok
    },
    [roundId],
  )

  const clearBets = useCallback(async () => {
    if (!roundId) return false
    if (!getCfGameSnapshot().bets.length) return false
    const { ok } = await cfClearBets(roundId)
    if (ok) markUndoAvailable(true)
    return ok
  }, [roundId])

  const clearBetsByTargetType = useCallback(
    async (type) => {
      if (!roundId || !type) return false
      const matching = getCfGameSnapshot().bets.filter(
        (bet) => bet.target?.type === type,
      )
      if (!matching.length) return false
      let any = false
      for (const bet of matching) {
        const { ok } = await cfRemoveChip({ roundId, betId: bet.id })
        if (ok) any = true
      }
      if (type === 'combo') {
        await cfSetComboPick(roundId, null)
      }
      if (type === 'crazyCombo') {
        await cfSetCrazyComboPicks(roundId, emptyCrazyComboPicks())
      }
      if (any) markUndoAvailable(true)
      return any
    },
    [roundId],
  )

  const undoBets = useCallback(async () => {
    if (!roundId) return false
    const { ok } = await cfUndoBets(roundId)
    if (!ok) return false
    const next = getCfGameSnapshot()
    onUndoMetaRef.current?.({
      comboPick: next.comboPick,
      crazyComboPicks: next.crazyComboPicks
        ? { ...next.crazyComboPicks }
        : emptyCrazyComboPicks(),
    })
    // Server undo stack depth is unknown; leave canUndo true until undo fails.
    markUndoAvailable(true)
    return true
  }, [roundId])

  const repeatLastBets = useCallback(async () => {
    if (!roundId) return false
    const { ok } = await cfRepeatLast(roundId)
    if (ok) markUndoAvailable(true)
    return ok
  }, [roundId])

  const doubleBets = useCallback(async () => {
    if (!roundId) return false
    if (!getCfGameSnapshot().bets.length) return false
    if (exceedsMaxBet(getCfGameSnapshot().bets.map((bet) => ({
      ...bet,
      chips: bet.chips.map((c) => ({ ...c, value: roundMoney(c.value * 2) })),
    })))) {
      // CF also caps; soft reject when every stack is already at max.
    }
    const { ok } = await cfDoubleBets(roundId)
    if (ok) markUndoAvailable(true)
    return ok
  }, [roundId])

  const syncComboPick = useCallback(
    async (nextPick) => {
      if (!roundId) return false
      const { ok } = await cfSetComboPick(roundId, nextPick)
      if (ok) markUndoAvailable(true)
      return ok
    },
    [roundId],
  )

  const syncCrazyComboPicks = useCallback(
    async (nextPicks) => {
      if (!roundId) return false
      const { ok } = await cfSetCrazyComboPicks(roundId, nextPicks)
      if (ok) markUndoAvailable(true)
      return ok
    },
    [roundId],
  )

  return {
    bets,
    totalBet,
    canUndo,
    canRepeat,
    carryRejected,
    placeBet,
    clearBets,
    clearBetsByTargetType,
    undoBets,
    repeatLastBets,
    doubleBets,
    syncComboPick,
    syncCrazyComboPicks,
    lastError: cf.lastError,
  }
}
