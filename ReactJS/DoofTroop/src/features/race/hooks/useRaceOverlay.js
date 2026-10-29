import { useEffect, useMemo, useState } from 'react'
import { shouldShowRaceOverlay } from '../../../domain/round/index.js'
import { serverNowMs } from '../../../shared/supabase/roundTimestamps.js'
import {
  winnersFromPlacements,
} from '../../settlement/utils/settlementFromRound.js'
import { resolveBetOutcomes } from '../../settlement/utils/resolveBetOutcomes.js'

/** Stop extrapolating when the last race progress sample is older than this. */
const RACE_SAMPLE_STALE_MS = 4000

/**
 * Race HUD visibility from `rounds.status` (+ podium gate).
 * Visible during RACE_RUNNING, and while RESULTS_RECORDED until the podium
 * presentation starts (COUNTDOWN stays clear). Never overlaps winners.
 *
 * @param {{ status: string | null, round?: Record<string, unknown> | null }} args
 */
export function useRaceOverlayState({ status, round = null }) {
  const isRace = shouldShowRaceOverlay(status, round)
  const raceKey = `${round?.id ?? ''}:${status ?? ''}`

  return {
    isRaceUiVisible: isRace,
    raceKey,
    raceElapsedMs: round?.race_elapsed_ms ?? null,
    raceUpdatedAt: round?.race_updated_at ?? null,
  }
}

/**
 * Elapsed race clock as MM:SS.
 * Bases on authoritative `race_elapsed_ms` samples and extrapolates between
 * updates using `race_updated_at`. Freezes when samples go stale.
 *
 * @param {{
 *   active: boolean,
 *   raceElapsedMs?: unknown,
 *   raceUpdatedAt?: string | null,
 *   raceKey?: string,
 * }} args
 */
export function useRaceElapsed({
  active,
  raceElapsedMs = null,
  raceUpdatedAt = null,
  raceKey = '',
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => setNow(Date.now()), 200)
    queueMicrotask(() => setNow(Date.now()))
    return () => clearInterval(id)
  }, [active, raceKey])

  const sampleMs = Number(raceElapsedMs)
  const sampleAtMs =
    typeof raceUpdatedAt === 'string' ? Date.parse(raceUpdatedAt) : NaN

  const elapsedMs = useMemo(() => {
    if (!active) return 0
    if (!Number.isFinite(sampleMs) || sampleMs < 0) return 0
    if (!Number.isFinite(sampleAtMs)) return sampleMs

    // Age vs server-aligned now so client clock skew does not drift the race clock.
    const age = Math.max(0, serverNowMs(now) - sampleAtMs)
    if (age > RACE_SAMPLE_STALE_MS) return sampleMs
    return sampleMs + age
  }, [active, sampleMs, sampleAtMs, now])

  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const label = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return { label, totalSeconds, elapsedMs }
}

/**
 * Potential win if the race finished with the current live leaderboard
 * (`race_placements` → provisional 1st/2nd/3rd). Not max-odds; not final settlement.
 *
 * @param {ReadonlyArray<object> | null | undefined} bets
 * @param {unknown} racePlacements
 * @param {{
 *   comboPick?: { kind?: string, key?: string } | null,
 *   crazyComboPicks?: Record<string, unknown> | null,
 * }} [meta]
 * @returns {number}
 */
export function potentialWinFromStandings(bets, racePlacements, meta = {}) {
  if (!bets?.length) return 0
  const winners = winnersFromPlacements(racePlacements)
  if (!winners) return 0
  const outcomes = resolveBetOutcomes(bets, winners, meta)
  return outcomes.totalWin ?? 0
}

/**
 * Live potential win from published bets × current `race_placements`.
 * @param {{
 *   active: boolean,
 *   bets?: ReadonlyArray<object>,
 *   racePlacements?: unknown,
 *   comboPick?: { kind?: string, key?: string } | null,
 *   crazyComboPicks?: Record<string, unknown> | null,
 * }} args
 */
export function usePotentialWin({
  active,
  bets = [],
  racePlacements = null,
  comboPick = null,
  crazyComboPicks = null,
}) {
  return useMemo(() => {
    if (!active) return 0
    return potentialWinFromStandings(bets, racePlacements, {
      comboPick,
      crazyComboPicks,
    })
  }, [active, bets, racePlacements, comboPick, crazyComboPicks])
}