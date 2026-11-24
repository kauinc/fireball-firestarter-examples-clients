import { useCallback, useEffect, useRef } from 'react'
import {
  clearCarryForwardSeed,
  markCarryForwardCharged,
  wasCarryForwardCharged,
} from '../state/carryForwardBetsStore.js'
import { useCanRepeatLastBets } from '../state/lastRoundBetsStore.js'
import { getBalance } from '../state/balanceStore.js'
import { getMaxBetPerTarget } from '../state/chipLadderStore.js'
import { emptyCrazyComboPicks } from '../constants/combo.js'
import { positionsForMetal } from '../constants/positions.js'
import { betTargetKey } from '../utils/betTargets.js'
import { roundMoney, stackTotal } from '../utils/chipMath.js'
import {
  getCfGameSnapshot,
  markUndoAvailable,
  useCfGameState,
} from '../../../shared/fireball/cfGameStore.js'
import { usesCfWallet } from '../../../shared/fireball/gameMode.js'
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
import {
  localCarryForward,
  localClearBets,
  localDoubleBets,
  localPlaceChip,
  localRemoveChip,
  localRepeatLast,
  localSetComboPick,
  localSetCrazyComboPicks,
  localUndoBets,
} from '../local/localWallet.js'
import { gciOpenDepositMenu } from '../../../shared/fireball/gciBridge.js'

function isInsufficient(reason) {
  return typeof reason === 'string' && /insufficient/i.test(reason)
}

function exceedsMaxBet(bets) {
  const max = getMaxBetPerTarget()
  return bets.some((bet) => stackTotal(bet.chips) > max)
}

function betsStakeTotal(bets) {
  return roundMoney(bets.reduce((sum, bet) => sum + stackTotal(bet.chips), 0))
}

/**
 * Chip placements — CF for coins/money, local wallet for fun.
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
  const remote = usesCfWallet()

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

  // Sync combo / crazy picks from store into overlay local state.
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

  // Carry-forward once per round.
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
        gciOpenDepositMenu()
        clearCarryForwardSeed(roundId)
        onCarryForwardRejectedRef.current?.()
        markCarryForwardCharged(roundId)
        return
      }

      const result = remote
        ? await cfCarryForward({
            roundId,
            bets: carry.bets,
            comboPick: carry.comboPick ?? null,
            crazyComboPicks: carry.crazyComboPicks ?? emptyCrazyComboPicks(),
          })
        : localCarryForward({
            roundId,
            bets: carry.bets,
            comboPick: carry.comboPick ?? null,
            crazyComboPicks: carry.crazyComboPicks ?? emptyCrazyComboPicks(),
          })

      if (cancelled) return
      markCarryForwardCharged(roundId)
      if (!result.ok) {
        if (isInsufficient(result.reason)) gciOpenDepositMenu()
        clearCarryForwardSeed(roundId)
        onCarryForwardRejectedRef.current?.()
      } else {
        markUndoAvailable(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [roundId, carry, remote])

  const placeBet = useCallback(
    async (amount, target, metal = 'gold') => {
      if (!roundId || !amount || !target || !metal) return false
      const key = betTargetKey(target)
      const existing = getCfGameSnapshot().bets.find((bet) => bet.key === key)
      const current = existing ? stackTotal(existing.chips) : 0
      if (roundMoney(current + amount) > getMaxBetPerTarget()) return false

      const nextStake = roundMoney(
        betsStakeTotal(getCfGameSnapshot().bets) + amount,
      )
      if (nextStake > getBalance()) {
        gciOpenDepositMenu()
        return false
      }

      const stakeMetal =
        target?.type === 'combo' || target?.type === 'crazyCombo'
          ? 'gold'
          : metal

      const result = remote
        ? await cfPlaceChip({
            roundId,
            target,
            metal: stakeMetal,
            chipValue: amount,
            positions: [...positionsForMetal(stakeMetal)],
          })
        : localPlaceChip({
            roundId,
            target,
            metal: stakeMetal,
            chipValue: amount,
            positions: [...positionsForMetal(stakeMetal)],
          })

      if (result.ok) markUndoAvailable(true)
      else if (isInsufficient(result.reason)) gciOpenDepositMenu()
      return result.ok
    },
    [roundId, remote],
  )

  const clearBets = useCallback(async () => {
    if (!roundId) return false
    if (!getCfGameSnapshot().bets.length) return false
    const result = remote
      ? await cfClearBets(roundId)
      : localClearBets(roundId)
    if (result.ok) markUndoAvailable(true)
    return result.ok
  }, [roundId, remote])

  const clearBetsByTargetType = useCallback(
    async (type) => {
      if (!roundId || !type) return false
      const matching = getCfGameSnapshot().bets.filter(
        (bet) => bet.target?.type === type,
      )
      if (!matching.length) return false
      let any = false
      for (const bet of matching) {
        const result = remote
          ? await cfRemoveChip({ roundId, betId: bet.id })
          : localRemoveChip({ roundId, betId: bet.id })
        if (result.ok) any = true
      }
      if (type === 'combo') {
        if (remote) await cfSetComboPick(roundId, null)
        else localSetComboPick(roundId, null)
      }
      if (type === 'crazyCombo') {
        if (remote) await cfSetCrazyComboPicks(roundId, emptyCrazyComboPicks())
        else localSetCrazyComboPicks(roundId, emptyCrazyComboPicks())
      }
      if (any) markUndoAvailable(true)
      return any
    },
    [roundId, remote],
  )

  const undoBets = useCallback(async () => {
    if (!roundId) return false
    const result = remote ? await cfUndoBets(roundId) : localUndoBets(roundId)
    if (!result.ok) return false
    const next = getCfGameSnapshot()
    onUndoMetaRef.current?.({
      comboPick: next.comboPick,
      crazyComboPicks: next.crazyComboPicks
        ? { ...next.crazyComboPicks }
        : emptyCrazyComboPicks(),
    })
    markUndoAvailable(true)
    return true
  }, [roundId, remote])

  const repeatLastBets = useCallback(async () => {
    if (!roundId) return false
    const result = remote
      ? await cfRepeatLast(roundId)
      : localRepeatLast(roundId)
    if (result.ok) markUndoAvailable(true)
    else if (isInsufficient(result.reason)) gciOpenDepositMenu()
    return result.ok
  }, [roundId, remote])

  const doubleBets = useCallback(async () => {
    if (!roundId) return false
    if (!getCfGameSnapshot().bets.length) return false
    if (
      exceedsMaxBet(
        getCfGameSnapshot().bets.map((bet) => ({
          ...bet,
          chips: bet.chips.map((c) => ({
            ...c,
            value: roundMoney(c.value * 2),
          })),
        })),
      )
    ) {
      // soft reject when every stack is already at max
    }
    const result = remote
      ? await cfDoubleBets(roundId)
      : localDoubleBets(roundId)
    if (result.ok) markUndoAvailable(true)
    else if (isInsufficient(result.reason)) gciOpenDepositMenu()
    return result.ok
  }, [roundId, remote])

  const syncComboPick = useCallback(
    async (nextPick) => {
      if (!roundId) return false
      const result = remote
        ? await cfSetComboPick(roundId, nextPick)
        : localSetComboPick(roundId, nextPick)
      if (result.ok) markUndoAvailable(true)
      return result.ok
    },
    [roundId, remote],
  )

  const syncCrazyComboPicks = useCallback(
    async (nextPicks) => {
      if (!roundId) return false
      const result = remote
        ? await cfSetCrazyComboPicks(roundId, nextPicks)
        : localSetCrazyComboPicks(roundId, nextPicks)
      if (result.ok) markUndoAvailable(true)
      return result.ok
    },
    [roundId, remote],
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
