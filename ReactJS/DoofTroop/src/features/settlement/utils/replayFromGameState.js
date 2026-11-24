import { getDoofImageUrl } from '../../betting/assets/doofImages.js'
import {
  field,
  normalizeBet,
  normalizeComboPick,
  normalizeCrazyComboPicks,
  normalizeSettlementResult,
} from '../../../shared/fireball/normalize.js'
import { WalletPhase } from '../../../shared/fireball/messages.js'
import { balanceFromRgs } from '../../../shared/fireball/client.js'

/**
 * Build a read-only replay view from an RGS GameState snapshot.
 * @param {Record<string, unknown> | null | undefined} gameState
 */
export function replayViewFromGameState(gameState) {
  if (!gameState || typeof gameState !== 'object') return null

  const walletPhase =
    field(gameState, 'WalletPhase', 'walletPhase') ?? WalletPhase.Settled
  const locked = (field(gameState, 'LockedBets', 'lockedBets') ?? [])
    .map(normalizeBet)
    .filter(Boolean)
  const lastRound = (field(gameState, 'LastRoundBets', 'lastRoundBets') ?? [])
    .map(normalizeBet)
    .filter(Boolean)
  const bets = locked.length > 0 ? locked : lastRound

  const settlementRaw = field(gameState, 'LastSettlement', 'lastSettlement')
  const settlement = settlementRaw
    ? normalizeSettlementResult(settlementRaw)
    : null

  const winners = (settlement?.winners ?? []).map((w) => ({
    ...w,
    src: w.src ?? getDoofImageUrl(w.color, w.pattern),
  }))

  /** @type {Record<string, 'win' | 'lose'> | null} */
  let settleByBetId = null
  const byId = settlement?.outcomes?.byId
  if (byId) {
    settleByBetId = {}
    for (const [id, result] of Object.entries(byId)) {
      settleByBetId[id] = result.won ? 'win' : 'lose'
    }
  }

  const lockedStakeCents = Number(
    field(gameState, 'LockedStakeCents', 'lockedStakeCents') ?? 0,
  )

  return {
    roundId: field(gameState, 'CurrentRoundId', 'currentRoundId') ?? null,
    walletPhase: String(walletPhase),
    bets,
    comboPick: normalizeComboPick(field(gameState, 'ComboPick', 'comboPick')),
    crazyComboPicks: normalizeCrazyComboPicks(
      field(gameState, 'CrazyComboPicks', 'crazyComboPicks'),
    ),
    settlement: settlement ? { ...settlement, winners } : null,
    settleByBetId,
    totalStake: balanceFromRgs(lockedStakeCents),
    totalWin: settlement?.totalWin ?? 0,
    didWin: Boolean(settlement?.didWin),
  }
}

/**
 * Prefer the latest non-empty GameState on a transaction.
 * @param {import('fireball-fireworks-sdk-client').Transaction | null | undefined} tx
 */
export function gameStateFromTransaction(tx) {
  const states = tx?.GameStates ?? []
  for (let i = states.length - 1; i >= 0; i -= 1) {
    const parsed =
      typeof states[i]?.parseGameState === 'function'
        ? states[i].parseGameState()
        : null
    if (parsed) return parsed
  }
  return null
}
