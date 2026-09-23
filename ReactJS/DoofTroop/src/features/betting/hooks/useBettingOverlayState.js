import { useEffect, useMemo, useState } from 'react'
import {
  BETTING_BANNER,
  BETTING_CLOSING_THRESHOLD_SECONDS,
  BETTING_WINDOW_SECONDS,
  BettingPhase,
  timerBarVariantFor,
} from '../constants/bettingPhase.js'
import { RoundState } from '../../../domain/round/index.js'

/** Mock window start per round — survives remount/reconnect for the same id. */
const openedAtByRoundId = new Map()

/** Unreal may emit ROUND_CREATED before BETTING_OPEN — treat both as open betting. */
const BETTING_OPEN_STATUSES = new Set([
  RoundState.ROUND_CREATED,
  RoundState.BETTING_OPEN,
])

/** Pre-race statuses that keep the red “BETS CLOSED” TimerBar over Unreal’s 3-2-1. */
const BANNER_ONLY_STATUSES = new Set([
  RoundState.BETTING_CLOSED,
  RoundState.TRACK_READY,
])

/**
 * Overlay UI from round `status` only (no timestamp inference for visibility).
 * Full board while ROUND_CREATED / BETTING_OPEN; TimerBar only through TRACK_READY.
 *
 * @param {{
 *   status: string | null,
 *   round?: Record<string, unknown> | null,
 * }} args
 */
export function useBettingOverlayState({ status, round = null }) {
  const [now, setNow] = useState(() => Date.now())
  const roundId = round?.id != null ? String(round.id) : null
  const isBettingOpen = BETTING_OPEN_STATUSES.has(status)

  useEffect(() => {
    if (!isBettingOpen || !roundId) return undefined

    if (!openedAtByRoundId.has(roundId)) {
      openedAtByRoundId.set(roundId, Date.now())
    }

    // Drop old keys so the map does not grow forever across rounds.
    for (const key of openedAtByRoundId.keys()) {
      if (key !== roundId) openedAtByRoundId.delete(key)
    }

    return undefined
  }, [isBettingOpen, roundId])

  useEffect(() => {
    if (!isBettingOpen) return undefined
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [isBettingOpen, roundId])

  return useMemo(() => {
    if (isBettingOpen) {
      const openedLocalAt = roundId ? openedAtByRoundId.get(roundId) : null
      let secondsLeft = BETTING_WINDOW_SECONDS
      if (openedLocalAt != null) {
        const elapsed = Math.floor((now - openedLocalAt) / 1000)
        secondsLeft = Math.max(0, BETTING_WINDOW_SECONDS - elapsed)
      }

      const phase =
        secondsLeft <= 0
          ? BettingPhase.CLOSED
          : secondsLeft <= BETTING_CLOSING_THRESHOLD_SECONDS
            ? BettingPhase.CLOSING
            : BettingPhase.OPEN

      return {
        phase,
        secondsLeft,
        bannerLabel: BETTING_BANNER[phase],
        timerVariant: timerBarVariantFor(secondsLeft, phase),
        isBannerVisible: true,
        isBoardVisible: true,
        isBettingUiVisible: true,
        canPlaceBets: secondsLeft > 0,
        disabled: secondsLeft <= 0,
      }
    }

    if (BANNER_ONLY_STATUSES.has(status)) {
      const phase = BettingPhase.CLOSED
      return {
        phase,
        secondsLeft: 0,
        bannerLabel: BETTING_BANNER[phase],
        timerVariant: timerBarVariantFor(0, phase),
        isBannerVisible: true,
        isBoardVisible: false,
        isBettingUiVisible: false,
        canPlaceBets: false,
        disabled: true,
      }
    }

    return {
      phase: BettingPhase.HIDDEN,
      secondsLeft: 0,
      bannerLabel: null,
      timerVariant: timerBarVariantFor(0, BettingPhase.HIDDEN),
      isBannerVisible: false,
      isBoardVisible: false,
      isBettingUiVisible: false,
      canPlaceBets: false,
      disabled: true,
    }
  }, [isBettingOpen, status, roundId, now])
}
