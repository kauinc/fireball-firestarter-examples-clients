import { emptyCrazyComboPicks } from '../constants/combo.js'

/**
 * Winning bets from the last settlement — re-seeded onto the next betting board.
 * Survives BettingRoundSession remount (`key={roundId}`).
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

  if (roundKey) {
    seededRoundId = roundKey
    seededPayload = pending
  }

  return pending
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

function cloneBet(bet) {
  return {
    ...bet,
    chips: (bet.chips ?? []).map((chip) => ({ ...chip })),
    positions: [...(bet.positions ?? [])],
    target: bet.target ? { ...bet.target } : bet.target,
  }
}
