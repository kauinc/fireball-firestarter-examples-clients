import { emptyCrazyComboPicks } from '../constants/combo.js'

/**
 * Full chip board from the previous betting round — used by Repeat Last.
 * Survives BettingRoundSession remount (`key={roundId}`).
 */

/** @type {{
 *   fromRoundId: string | null,
 *   bets: ReadonlyArray<Record<string, unknown>>,
 *   comboPick: { kind: string, key: string } | null,
 *   crazyComboPicks: Record<string, { color: string, pattern: string } | null>,
 * } | null} */
let lastRound = null

/**
 * @param {{
 *   fromRoundId?: string | null,
 *   bets?: ReadonlyArray<Record<string, unknown>>,
 *   comboPick?: { kind: string, key: string } | null,
 *   crazyComboPicks?: Record<string, { color: string, pattern: string } | null>,
 * }} payload
 */
export function setLastRoundBets(payload = {}) {
  const bets = Array.isArray(payload.bets) ? payload.bets : []
  lastRound = {
    fromRoundId:
      payload.fromRoundId != null ? String(payload.fromRoundId) : null,
    bets: Object.freeze(bets.map(cloneBet)),
    comboPick: payload.comboPick ? { ...payload.comboPick } : null,
    crazyComboPicks: Object.freeze({
      ...(payload.crazyComboPicks ?? emptyCrazyComboPicks()),
    }),
  }
}

/** @returns {typeof lastRound} */
export function getLastRoundBets() {
  return lastRound
}

export function hasLastRoundBets() {
  return Boolean(lastRound?.bets?.length)
}

function cloneBet(bet) {
  return {
    ...bet,
    chips: (bet.chips ?? []).map((chip) => ({ ...chip })),
    positions: [...(bet.positions ?? [])],
    target: bet.target ? { ...bet.target } : bet.target,
  }
}
