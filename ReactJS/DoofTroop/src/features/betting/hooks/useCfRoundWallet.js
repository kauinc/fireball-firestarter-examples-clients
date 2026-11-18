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
 * Drive CF lock / settle / cancel from Supabase round lifecycle.
 * @param {{
 *   round: Record<string, unknown> | null,
 *   status: string | null,
 *   fireballReady: boolean,
 * }} args
 */
export function useCfRoundWallet({ round, status, fireballReady }) {
  const lockSentFor = useRef(/** @type {string | null} */ (null))
  const settleDoneFor = useRef(/** @type {string | null} */ (null))
  const settleInFlight = useRef(/** @type {string | null} */ (null))
  const cancelSentFor = useRef(/** @type {string | null} */ (null))
  const roundRef = useRef(round)
  const statusRef = useRef(status)

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

    const claimed = claimedPlacementsFromRound(liveRound?.placements)
    settleInFlight.current = roundId
    void cfSettleRound(roundId, claimed).finally(() => {
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
    })
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
      void cfLockBets(roundId)
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
      void cfCancelRound(roundId)
    }
  }, [fireballReady, round, status])

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
          void cfCancelRound(roundId)
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

/**
 * Soft balance refresh after reconnect errors.
 */
export async function refreshBalanceFromRgs() {
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
