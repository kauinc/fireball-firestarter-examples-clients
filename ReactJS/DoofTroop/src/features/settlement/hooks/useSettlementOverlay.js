import { useEffect, useMemo, useState } from 'react'
import { RoundState } from '../../../domain/round/index.js'
import {
  roundHasResults,
  settlementFromRound,
} from '../utils/settlementFromRound.js'

/** New round / pre-results stages — hide settlement immediately. */
const CLEARS_SETTLEMENT = new Set([
  RoundState.CREATED,
  RoundState.BETTING_OPEN,
  RoundState.BETTING_CLOSED,
  RoundState.COUNTDOWN,
  RoundState.RACE_RUNNING,
])

/** Statuses that show (or keep) the settlement HUD for the current round. */
const SETTLEMENT_STATUSES = new Set([
  RoundState.RESULTS_RECORDED,
  RoundState.FINISHED,
])

/**
 * Settlement HUD from `RESULTS_RECORDED` through `FINISHED`, until the next
 * round lifecycle starts (`CREATED` / betting / race). Snapshot survives the
 * RESULTS→FINISHED transition so placements stay on screen between rounds.
 *
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
  const hasLiveResults = Boolean(roundId && roundHasResults(round))
  const isSettlementStatus =
    status != null && SETTLEMENT_STATUSES.has(status) && hasLiveResults
  const nextRoundStarted = status != null && CLEARS_SETTLEMENT.has(status)

  const [latchedRoundId, setLatchedRoundId] = useState(null)
  /** Frozen round row with placements — survives RESULTS→FINISHED. */
  const [resultsRound, setResultsRound] = useState(null)

  useEffect(() => {
    if (isSettlementStatus && roundId) {
      if (latchedRoundId === roundId && resultsRound) {
        // Refresh snapshot if live row still has results (e.g. times filled in).
        if (roundHasResults(round) && resultsRound !== round) {
          const id = window.setTimeout(() => setResultsRound(round), 0)
          return () => window.clearTimeout(id)
        }
        return undefined
      }
      const armId = window.setTimeout(() => {
        setLatchedRoundId(roundId)
        setResultsRound(round)
      }, 0)
      return () => window.clearTimeout(armId)
    }

    // Next round created / betting / race — clear immediately.
    if (nextRoundStarted) {
      if (!latchedRoundId && !resultsRound) return undefined
      const clearId = window.setTimeout(() => {
        setLatchedRoundId(null)
        setResultsRound(null)
      }, 0)
      return () => window.clearTimeout(clearId)
    }

    // Different round id without a clear status (e.g. late snapshot) — drop.
    if (
      latchedRoundId &&
      roundId &&
      roundId !== latchedRoundId &&
      !isSettlementStatus
    ) {
      const clearId = window.setTimeout(() => {
        setLatchedRoundId(null)
        setResultsRound(null)
      }, 0)
      return () => window.clearTimeout(clearId)
    }

    return undefined
  }, [
    isSettlementStatus,
    nextRoundStarted,
    round,
    roundId,
    latchedRoundId,
    resultsRound,
  ])

  const activeRoundId = nextRoundStarted
    ? null
    : isSettlementStatus
      ? roundId
      : latchedRoundId

  const sourceRound =
    activeRoundId == null
      ? null
      : isSettlementStatus &&
          roundHasResults(round) &&
          String(round.id) === activeRoundId
        ? round
        : resultsRound && String(resultsRound.id) === activeRoundId
          ? resultsRound
          : null

  const settlement = useMemo(() => {
    if (!sourceRound) return null
    return settlementFromRound(sourceRound, {
      bets,
      comboPick,
      crazyComboPicks,
    })
  }, [sourceRound, bets, comboPick, crazyComboPicks])

  return {
    isSettlementUiVisible: Boolean(activeRoundId && settlement),
    settlement,
    settlementRoundId: activeRoundId,
  }
}
