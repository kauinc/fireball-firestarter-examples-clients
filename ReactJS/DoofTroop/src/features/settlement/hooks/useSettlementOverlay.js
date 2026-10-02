import { useEffect, useMemo, useState } from 'react'
import { RoundState } from '../../../domain/round/index.js'
import { mockSettlementForRound } from '../utils/mockSettlement.js'

/** Keep RESULTS UI visible long enough for chip + count-up + history animations. */
export const SETTLEMENT_MIN_VISIBLE_MS = 9000

/** Next lifecycle stages that must clear settlement immediately. */
const CLEARS_SETTLEMENT = new Set([
  RoundState.BETTING_OPEN,
  RoundState.BETTING_CLOSED,
  RoundState.TRACK_READY,
  RoundState.RACE_RUNNING,
  RoundState.ROUND_CREATED,
])

/**
 * Settlement HUD when `rounds.status === RESULTS_SENT` (latched briefly after).
 * Latch never spans into the next betting/race overlay.
 * @param {{
 *   status: string | null,
 *   round?: Record<string, unknown> | null,
 *   bets?: ReadonlyArray<object>,
 *   comboPick?: { kind: string, key: string } | null,
 *   crazyComboPicks?: Record<string, { color: string, pattern: string } | null>,
 * }} args
 */
export function useSettlementOverlayState({
  status,
  round = null,
  bets = [],
  comboPick = null,
  crazyComboPicks = null,
}) {
  const roundId = round?.id != null ? String(round.id) : null
  const isResults = status === RoundState.RESULTS_SENT && Boolean(roundId)
  const nextPhaseStarted = status != null && CLEARS_SETTLEMENT.has(status)

  const [latchedRoundId, setLatchedRoundId] = useState(null)
  const [latchUntil, setLatchUntil] = useState(0)

  useEffect(() => {
    if (isResults && roundId) {
      const armId = window.setTimeout(() => {
        setLatchedRoundId(roundId)
        setLatchUntil(Date.now() + SETTLEMENT_MIN_VISIBLE_MS)
      }, 0)
      return () => window.clearTimeout(armId)
    }

    if (nextPhaseStarted || !latchedRoundId) {
      if (latchedRoundId) {
        const clearId = window.setTimeout(() => {
          setLatchedRoundId(null)
          setLatchUntil(0)
        }, 0)
        return () => window.clearTimeout(clearId)
      }
      return undefined
    }

    // Drop latch if Supabase already moved to a newer round id.
    if (roundId && roundId !== latchedRoundId) {
      const clearId = window.setTimeout(() => {
        setLatchedRoundId(null)
        setLatchUntil(0)
      }, 0)
      return () => window.clearTimeout(clearId)
    }

    const remaining = latchUntil - Date.now()
    if (remaining <= 0) {
      const clearId = window.setTimeout(() => {
        setLatchedRoundId(null)
        setLatchUntil(0)
      }, 0)
      return () => window.clearTimeout(clearId)
    }

    const id = window.setTimeout(() => {
      setLatchedRoundId(null)
      setLatchUntil(0)
    }, remaining)
    return () => window.clearTimeout(id)
  }, [isResults, nextPhaseStarted, roundId, latchedRoundId, latchUntil])

  const activeRoundId = isResults
    ? roundId
    : nextPhaseStarted
      ? null
      : latchedRoundId
  const isSettlementUiVisible = Boolean(activeRoundId)

  const settlement = useMemo(() => {
    if (!activeRoundId) return null
    return mockSettlementForRound(activeRoundId, {
      bets,
      comboPick,
      crazyComboPicks,
    })
  }, [activeRoundId, bets, comboPick, crazyComboPicks])

  return {
    isSettlementUiVisible,
    settlement,
    settlementRoundId: activeRoundId,
  }
}
