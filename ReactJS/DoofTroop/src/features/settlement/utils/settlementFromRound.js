import { POSITION_OPTIONS } from '../../betting/constants/doofs.js'
import { getDoofImageUrl } from '../../betting/assets/doofImages.js'
import {
  doofFromIndex,
  formatFinishTimeLabel,
  formatFinishTimeMsLabel,
} from '../../betting/constants/doofIndex.js'
import { resolveBetOutcomes } from './resolveBetOutcomes.js'

/**
 * @typedef {{ place: '1st' | '2nd' | '3rd', color: string, pattern: string, src: string | null, timeLabel: string | null, doofIndex: number }} PodiumWinner
 */

/**
 * Parse Supabase round podium into winners.
 * New contract: `placements` is ordered Doof indexes (0–17); times in
 * `finisher_times_ms` match by array position.
 *
 * Also accepts legacy object rows `[{ doof_index, finish_time }, …]`.
 *
 * @param {unknown} placements
 * @param {unknown} [finisherTimesMs]
 * @returns {PodiumWinner[] | null}
 */
export function winnersFromPlacements(placements, finisherTimesMs = null) {
  if (!Array.isArray(placements) || placements.length === 0) return null

  /** @type {PodiumWinner[]} */
  const winners = []
  for (let i = 0; i < POSITION_OPTIONS.length; i += 1) {
    const entry = placements[i]
    let doofIndex
    let timeLabel = null

    if (typeof entry === 'number' || typeof entry === 'string') {
      doofIndex = Number(entry)
      const ms =
        Array.isArray(finisherTimesMs) && finisherTimesMs[i] != null
          ? Number(finisherTimesMs[i])
          : NaN
      timeLabel = Number.isFinite(ms)
        ? formatFinishTimeMsLabel(ms)
        : null
    } else if (entry && typeof entry === 'object') {
      doofIndex = Number(entry.doof_index)
      timeLabel = formatFinishTimeLabel(entry.finish_time)
    } else {
      return null
    }

    const doof = doofFromIndex(doofIndex)
    if (!doof) return null
    winners.push({
      place: POSITION_OPTIONS[i],
      color: doof.color,
      pattern: doof.pattern,
      src: getDoofImageUrl(doof.color, doof.pattern),
      timeLabel,
      doofIndex,
    })
  }
  return winners
}

/**
 * Podium winners from a full Supabase round row.
 * @param {Record<string, unknown> | null | undefined} round
 * @returns {PodiumWinner[] | null}
 */
export function winnersFromRound(round) {
  if (!round) return null
  return winnersFromPlacements(round.placements, round.finisher_times_ms)
}

/**
 * True when a round row has usable race results.
 * @param {Record<string, unknown> | null | undefined} round
 */
export function roundHasResults(round) {
  return Boolean(winnersFromRound(round))
}

/**
 * Settlement from a Supabase round row (placements + finisher_times_ms).
 *
 * @param {Record<string, unknown> | null | undefined} round
 * @param {{
 *   bets?: ReadonlyArray<object>,
 *   comboPick?: { kind: string, key: string } | null,
 *   crazyComboPicks?: Record<string, { color: string, pattern: string } | null>,
 * }} [options]
 */
export function settlementFromRound(
  round,
  { bets = [], comboPick = null, crazyComboPicks = null } = {},
) {
  const winners = winnersFromRound(round)
  if (!winners) return null

  const outcomes = resolveBetOutcomes(bets, winners, {
    comboPick,
    crazyComboPicks,
  })

  return Object.freeze({
    didWin: outcomes.didWin,
    totalWin: outcomes.totalWin,
    winCount: outcomes.winCount,
    winners: Object.freeze(winners),
    outcomes,
  })
}
