import { POSITION_OPTIONS } from '../../betting/constants/doofs.js'
import { getDoofImageUrl } from '../../betting/assets/doofImages.js'
import {
  doofFromIndex,
  formatFinishTimeLabel,
} from '../../betting/constants/doofIndex.js'
import { resolveBetOutcomes } from './resolveBetOutcomes.js'

/**
 * @typedef {{ place: '1st' | '2nd' | '3rd', color: string, pattern: string, src: string | null, timeLabel: string | null, doofIndex: number }} PodiumWinner
 */

/**
 * Parse Supabase `rounds.placements` into podium winners.
 * Expected shape: `[{ doof_index, finish_time }, …]` ordered 1st → 3rd.
 *
 * @param {unknown} placements
 * @returns {PodiumWinner[] | null}
 */
export function winnersFromPlacements(placements) {
  if (!Array.isArray(placements) || placements.length === 0) return null

  /** @type {PodiumWinner[]} */
  const winners = []
  for (let i = 0; i < POSITION_OPTIONS.length; i += 1) {
    const entry = placements[i]
    if (!entry || typeof entry !== 'object') return null
    const doofIndex = Number(entry.doof_index)
    const doof = doofFromIndex(doofIndex)
    if (!doof) return null
    winners.push({
      place: POSITION_OPTIONS[i],
      color: doof.color,
      pattern: doof.pattern,
      src: getDoofImageUrl(doof.color, doof.pattern),
      timeLabel: formatFinishTimeLabel(entry.finish_time),
      doofIndex,
    })
  }
  return winners
}

/**
 * True when a round row has usable race results.
 * @param {Record<string, unknown> | null | undefined} round
 */
export function roundHasResults(round) {
  return Boolean(winnersFromPlacements(round?.placements))
}

/**
 * Settlement from a Supabase round row (placements + optional winner_doof_index).
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
  const winners = winnersFromPlacements(round?.placements)
  if (!winners) return null

  // Prefer placements[0]; fall back to winner_doof_index if it disagrees (log only).
  const declaredWinner = Number(round?.winner_doof_index)
  if (
    Number.isInteger(declaredWinner) &&
    winners[0]?.doofIndex !== declaredWinner &&
    import.meta.env.DEV
  ) {
    console.warn('[settlement] winner_doof_index mismatch', {
      winner_doof_index: declaredWinner,
      placements0: winners[0]?.doofIndex,
      round_number: round?.round_number,
    })
  }

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
