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
 * Build a read-only replay view from a saved RGS GameState snapshot.
 * @param {Record<string, unknown> | null | undefined} gameState
 */
export function replayViewFromGameState(gameState) {
  if (!gameState || typeof gameState !== 'object') {
    return null
  }

  const walletPhase =
    field(gameState, 'WalletPhase', 'walletPhase') ?? WalletPhase.Settled
  const locked = (field(gameState, 'LockedBets', 'lockedBets') ?? [])
    .map(normalizeBet)
    .filter(Boolean)
  const lastRound = (field(gameState, 'LastRoundBets', 'lastRoundBets') ?? [])
    .map(normalizeBet)
    .filter(Boolean)
  const bets =
    locked.length > 0
      ? locked
      : lastRound.length > 0
        ? lastRound
        : []

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
    currency: field(gameState, 'Currency', 'currency') ?? null,
    gameMode: field(gameState, 'GameMode', 'gameMode') ?? null,
    bets,
    comboPick: normalizeComboPick(field(gameState, 'ComboPick', 'comboPick')),
    crazyComboPicks: normalizeCrazyComboPicks(
      field(gameState, 'CrazyComboPicks', 'crazyComboPicks'),
    ),
    settlement: settlement
      ? { ...settlement, winners }
      : null,
    settleByBetId,
    totalStake: balanceFromRgs(lockedStakeCents),
    totalWin: settlement?.totalWin ?? 0,
    didWin: Boolean(settlement?.didWin),
    lastReplayId: field(gameState, 'LastReplayId', 'lastReplayId') ?? null,
  }
}
