import { useEffect, useMemo, useState } from 'react'
import {
  RoundState,
  shouldClearSettlementLatch,
  shouldShowWinners,
} from '../../../domain/round/index.js'
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

/**
 * Settlement / winner HUD when results are accepted and podium presentation
 * has started (`podium_transition_started_at` or `podium_entered_at`).
 * Snapshot latches only after that gate so recovery FINISHED without podium
 * never mounts winners; clears when the next round lifecycle starts, or when
 * the live row drops podium stamps (back to race hold).
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
  const showWinners =
    Boolean(roundId) && shouldShowWinners(round) && hasLiveResults
  const nextRoundStarted = status != null && CLEARS_SETTLEMENT.has(status)
  const revokePodiumLatch = shouldClearSettlementLatch(status, round)

  const [latchedRoundId, setLatchedRoundId] = useState(null)
  /** Frozen round row with placements — survives podium → FINISHED. */
  const [resultsRound, setResultsRound] = useState(null)

  useEffect(() => {
    if (showWinners && roundId) {
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

    // Podium stamps cleared / recovery FINISHED without podium — drop latch so
    // race-hold and settlement cannot mount together.
    if (revokePodiumLatch) {
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
      !showWinners
    ) {
      const clearId = window.setTimeout(() => {
        setLatchedRoundId(null)
        setResultsRound(null)
      }, 0)
      return () => window.clearTimeout(clearId)
    }

    return undefined
  }, [
    showWinners,
    nextRoundStarted,
    revokePodiumLatch,
    round,
    roundId,
    latchedRoundId,
    resultsRound,
  ])

  const activeRoundId =
    nextRoundStarted || revokePodiumLatch
      ? null
      : showWinners
        ? roundId
        : latchedRoundId

  const sourceRound =
    activeRoundId == null
      ? null
      : showWinners &&
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
