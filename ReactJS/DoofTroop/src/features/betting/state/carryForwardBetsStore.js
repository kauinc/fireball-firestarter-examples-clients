import { emptyCrazyComboPicks } from '../constants/combo.js'
import { cloneBet } from '../utils/cloneBet.js'

/**
 * Winning bets from the last settlement — re-seeded onto the next betting board.
 * Survives BettingRoundSession remount (`key={roundId}`).
 * Consumed once when a new betting round reads them (not reusable across rounds).
 */

/** @type {{
 *   fromRoundId: string | null,
 *   bets: ReadonlyArray<Record<string, unknown>>,
 *   comboPick: { kind: string, key: string } | null,
 *   crazyComboPicks: Record<string, { color: string, pattern: string } | null>,
 * } | null} */
let pending = null

/** Payload locked to a betting round (Strict Mode remount safe). */
let seededRoundId = null
/** @type {typeof pending} */
let seededPayload = null

/** Round ids that already charged stake for a carry-forward seed. */
const chargedRoundIds = new Set()

/**
 * Snapshot winning bets after settlement resolves.
 * @param {{
 *   fromRoundId?: string | null,
 *   bets?: ReadonlyArray<Record<string, unknown>>,
 *   comboPick?: { kind: string, key: string } | null,
 *   crazyComboPicks?: Record<string, { color: string, pattern: string } | null>,
 * }} payload
 */
export function setCarryForwardBets(payload = {}) {
  const bets = Array.isArray(payload.bets) ? payload.bets : []
  pending = {
    fromRoundId:
      payload.fromRoundId != null ? String(payload.fromRoundId) : null,
    bets: Object.freeze(bets.map(cloneBet)),
    comboPick: payload.comboPick ? { ...payload.comboPick } : null,
    crazyComboPicks: Object.freeze({
      ...(payload.crazyComboPicks ?? emptyCrazyComboPicks()),
    }),
  }
  seededRoundId = null
  seededPayload = null
}

/**
 * Winning bets to place on a new betting round (not the round that produced them).
 * Consumes `pending` so the same winners are not re-seeded on later rounds.
 * @param {string | null | undefined} forRoundId
 */
export function getCarryForwardBets(forRoundId) {
  const roundKey = forRoundId != null ? String(forRoundId) : null

  if (roundKey && seededRoundId === roundKey) {
    return seededPayload
  }

  if (!pending?.bets?.length) return null
  if (roundKey && pending.fromRoundId != null && roundKey === pending.fromRoundId) {
    return null
  }

  const payload = pending
  // Consume — only this betting round may seed these winners.
  pending = null

  if (roundKey) {
    seededRoundId = roundKey
    seededPayload = payload
  }

  return payload
}

/**
 * Drop a seeded carry-forward for this round (e.g. wallet cannot cover re-stake).
 * @param {string | null | undefined} roundId
 */
export function clearCarryForwardSeed(roundId) {
  if (roundId == null) return
  if (seededRoundId === String(roundId)) {
    seededPayload = null
    seededRoundId = null
  }
}

/**
 * Whether stake for this round's carry-forward has already been deducted.
 * @param {string | null | undefined} roundId
 */
export function wasCarryForwardCharged(roundId) {
  if (roundId == null) return false
  return chargedRoundIds.has(String(roundId))
}

/**
 * Mark stake deducted for this round's carry-forward seed.
 * @param {string | null | undefined} roundId
 */
export function markCarryForwardCharged(roundId) {
  if (roundId == null) return
  chargedRoundIds.add(String(roundId))
}
