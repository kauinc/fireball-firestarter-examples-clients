import { useEffect, useRef } from 'react'
import {
  RoundState,
  shouldShowWinners,
} from '../../../domain/round/index.js'
import {
  cfCancelRound,
  cfLockBets,
  cfSettleRound,
} from '../../../shared/fireball/cfRequests.js'
import {
  getCfGameSnapshot,
  subscribeCfGame,
} from '../../../shared/fireball/cfGameStore.js'
import { WalletPhase } from '../../../shared/fireball/messages.js'
import { getBalance, setBalance } from '../state/balanceStore.js'
import {
  balanceFromRgs,
  getDoofFireball,
} from '../../../shared/fireball/client.js'
import { usesCfWallet } from '../../../shared/fireball/gameMode.js'
import {
  localCancelRound,
  localLockBets,
  localSettleRound,
} from '../local/localWallet.js'

/**
 * @param {unknown} placements
 * @returns {number[] | null}
 */
function claimedPlacementsFromRound(placements) {
  if (!Array.isArray(placements) || placements.length < 3) return null
  const indexes = []
  for (let i = 0; i < 3; i += 1) {
    const entry = placements[i]
    const n =
      typeof entry === 'number' || typeof entry === 'string'
        ? Number(entry)
        : Number(entry?.doof_index)
    if (!Number.isFinite(n)) return null
    indexes.push(n)
  }
  return indexes
}

function hasPendingOrLocked(snapshot) {
  return (
    (snapshot.bets?.length ?? 0) > 0 ||
    (snapshot.lockedBets?.length ?? 0) > 0
  )
}

/**
 * Drive lock / settle / cancel from Supabase round lifecycle.
 * Fun → local wallet; coins/money → CF.
 * @param {{
 *   round: Record<string, unknown> | null,
 *   status: string | null,
 *   fireballReady: boolean,
 * }} args
 */
export function useRoundWallet({ round, status, fireballReady }) {
  const lockSentFor = useRef(/** @type {string | null} */ (null))
  const settleDoneFor = useRef(/** @type {string | null} */ (null))
  const settleInFlight = useRef(/** @type {string | null} */ (null))
  const cancelSentFor = useRef(/** @type {string | null} */ (null))
  const roundRef = useRef(round)
  const statusRef = useRef(status)
  const remote = usesCfWallet()

  useEffect(() => {
    roundRef.current = round
    statusRef.current = status
  }, [round, status])

  function trySettle(roundId, liveRound) {
    const snapshot = getCfGameSnapshot()
    if (
      snapshot.walletPhase === WalletPhase.Settled ||
      snapshot.walletPhase === WalletPhase.Refunded
    ) {
      settleDoneFor.current = roundId
      return
    }
    if (snapshot.walletPhase === WalletPhase.Rejected) {
      settleDoneFor.current = roundId
      return
    }
    if (settleDoneFor.current === roundId) return
    if (settleInFlight.current === roundId) return

    if (
      (snapshot.lockedBets?.length ?? 0) === 0 &&
      (snapshot.bets?.length ?? 0) === 0 &&
      (snapshot.walletPhase === WalletPhase.Idle ||
        snapshot.walletPhase === WalletPhase.Pending)
    ) {
      settleDoneFor.current = roundId
      return
    }

    settleInFlight.current = roundId

    const finish = () => {
      if (settleInFlight.current === roundId) {
        settleInFlight.current = null
      }
      const after = getCfGameSnapshot()
      if (
        after.walletPhase === WalletPhase.Settled ||
        after.walletPhase === WalletPhase.Refunded ||
        after.walletPhase === WalletPhase.Rejected
      ) {
        settleDoneFor.current = roundId
      }
    }

    if (!remote) {
      localSettleRound(roundId, liveRound)
      finish()
      return
    }

    const claimed = claimedPlacementsFromRound(liveRound?.placements)
    void cfSettleRound(roundId, claimed).finally(finish)
  }

  useEffect(() => {
    if (!fireballReady || !round?.id || !status) return
    const roundId = String(round.id)
    const snapshot = getCfGameSnapshot()

    if (
      status === RoundState.BETTING_CLOSED ||
      status === RoundState.COUNTDOWN
    ) {
      if (lockSentFor.current === roundId) return
      if (
        snapshot.walletPhase === WalletPhase.Locked ||
        snapshot.walletPhase === WalletPhase.Locking ||
        snapshot.walletPhase === WalletPhase.Settled ||
        snapshot.walletPhase === WalletPhase.Refunded ||
        snapshot.walletPhase === WalletPhase.Rejected
      ) {
        lockSentFor.current = roundId
        return
      }
      if ((snapshot.bets?.length ?? 0) === 0) {
        lockSentFor.current = roundId
        return
      }
      lockSentFor.current = roundId
      if (remote) void cfLockBets(roundId)
      else localLockBets(roundId)
      return
    }

    if (shouldShowWinners(round)) {
      trySettle(roundId, round)
      return
    }

    if (status === RoundState.CANCELLED) {
      if (cancelSentFor.current === roundId) return
      if (
        !hasPendingOrLocked(snapshot) &&
        snapshot.walletPhase !== WalletPhase.Locked &&
        snapshot.walletPhase !== WalletPhase.Locking &&
        snapshot.walletPhase !== WalletPhase.Pending
      ) {
        cancelSentFor.current = roundId
        return
      }
      cancelSentFor.current = roundId
      if (remote) void cfCancelRound(roundId)
      else localCancelRound(roundId)
    }
  }, [fireballReady, round, status, remote])

  // bets-locked during podium → settle; bets-locked during cancel → cancel.
  useEffect(() => {
    if (!fireballReady) return undefined
    return subscribeCfGame(() => {
      const liveRound = roundRef.current
      const liveStatus = statusRef.current
      if (!liveRound?.id) return
      const snap = getCfGameSnapshot()
      const roundId = String(liveRound.id)

      if (liveStatus === RoundState.CANCELLED) {
        if (cancelSentFor.current === roundId) return
        if (
          snap.walletPhase === WalletPhase.Locked ||
          snap.walletPhase === WalletPhase.Rejected ||
          snap.walletPhase === WalletPhase.Pending
        ) {
          cancelSentFor.current = roundId
          if (usesCfWallet()) void cfCancelRound(roundId)
          else localCancelRound(roundId)
        }
        return
      }

      if (!shouldShowWinners(liveRound)) return

      if (
        snap.walletPhase === WalletPhase.Settled ||
        snap.walletPhase === WalletPhase.Refunded
      ) {
        settleDoneFor.current = roundId
        return
      }

      if (snap.walletPhase === WalletPhase.Locked) {
        trySettle(roundId, liveRound)
      }
    })
  }, [fireballReady])
}

/** @deprecated Use useRoundWallet */
export const useCfRoundWallet = useRoundWallet

/**
 * Soft balance refresh after reconnect errors (CF modes only).
 */
export async function refreshBalanceFromRgs() {
  if (!usesCfWallet()) return getBalance()
  try {
    const fireball = getDoofFireball()
    if (!fireball.isAuth) return getBalance()
    const res = await fireball.getBalance()
    if (res?.Balance != null) {
      setBalance(balanceFromRgs(res.Balance))
    }
  } catch {
    // ignore — HUD keeps last known
  }
  return getBalance()
}
