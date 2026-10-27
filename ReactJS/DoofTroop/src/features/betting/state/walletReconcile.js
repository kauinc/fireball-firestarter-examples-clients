import { RoundState } from '../../../domain/round/index.js'
import {
  roundHasResults,
  settlementFromRound,
} from '../../settlement/utils/settlementFromRound.js'
import { roundMoney, stackTotal } from '../utils/chipMath.js'
import { refundStakeOnce, settleRoundWin } from './balanceStore.js'

function betsStakeTotal(bets) {
  return roundMoney(
    (bets ?? []).reduce((sum, bet) => sum + stackTotal(bet.chips ?? []), 0),
  )
}

/**
 * Keep the play-money wallet in sync with round lifecycle even if settlement
 * UI never mounts (missed RESULTS_RECORDED) or the round is cancelled.
 *
 * @param {Record<string, unknown> | null | undefined} round
 * @param {{
 *   roundId?: string | null,
 *   bets?: ReadonlyArray<object>,
 *   comboPick?: { kind: string, key: string } | null,
 *   crazyComboPicks?: Record<string, { color: string, pattern: string } | null>,
 * } | null | undefined} published
 */
export function reconcileRoundWallet(round, published) {
  if (!round?.id) return
  const roundId = String(round.id)
  const status = typeof round.status === 'string' ? round.status : null
  const sameRound =
    published?.roundId != null && String(published.roundId) === roundId
  const bets = sameRound ? (published.bets ?? []) : []
  const comboPick = sameRound ? (published.comboPick ?? null) : null
  const crazyComboPicks = sameRound ? (published.crazyComboPicks ?? null) : null

  if (status === RoundState.CANCELLED) {
    const stake = betsStakeTotal(bets)
    if (stake > 0) refundStakeOnce(roundId, stake)
    return
  }

  const canSettle =
    (status === RoundState.RESULTS_RECORDED ||
      status === RoundState.FINISHED) &&
    roundHasResults(round)

  if (canSettle) {
    const settlement = settlementFromRound(round, {
      bets,
      comboPick,
      crazyComboPicks,
    })
    // Always record the settlement (even 0) so a later CANCELLED cannot
    // also refund the stake.
    if (settlement) settleRoundWin(roundId, settlement.totalWin)
  }
}
