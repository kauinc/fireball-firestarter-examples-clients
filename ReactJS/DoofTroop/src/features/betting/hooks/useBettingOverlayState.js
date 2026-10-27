import { useEffect, useMemo, useState } from 'react'
import {
  BETTING_BANNER,
  BETTING_CLOSING_THRESHOLD_SECONDS,
  BETTING_WINDOW_SECONDS,
  BettingPhase,
  timerBarVariantFor,
} from '../constants/bettingPhase.js'
import { RoundState } from '../../../domain/round/index.js'
import {
  parseTimestampMs,
  serverNowMs,
} from '../../../shared/supabase/roundTimestamps.js'

/** Fallback open time when deadline is missing — survives remount per round. */
const openedAtByRoundId = new Map()

/**
 * Seconds until `betting_deadline` using server-aligned now.
 * Does not cap/freeze at the open→deadline window — that made a lagging
 * client clock stick at 30s then jump to CLOSED while the bar still had time.
 *
 * @param {unknown} deadline
 * @param {number} nowMs - prefer `serverNowMs()`
 * @returns {number | null}
 */
function secondsUntilDeadline(deadline, nowMs) {
  const endMs = parseTimestampMs(deadline)
  if (endMs == null) return null
  // Round to nearest second so a slightly-lagging clock does not sit +1s
  // via Math.ceil for almost the whole window.
  return Math.max(0, Math.round((endMs - nowMs) / 1000))
}

/**
 * Bet admission: status must be BETTING_OPEN and the server-aligned clock
 * must not have passed `betting_deadline` (when the row carries one).
 *
 * @param {string | null | undefined} status
 * @param {Record<string, unknown> | null | undefined} round
 * @param {number} [clientNowMs]
 */
export function isBettingAdmissionOpen(status, round, clientNowMs = Date.now()) {
  if (status !== RoundState.BETTING_OPEN) return false
  const endMs = parseTimestampMs(round?.betting_deadline)
  if (endMs == null) return true
  return serverNowMs(clientNowMs) < endMs
}

function closedState() {
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

/**
 * Betting overlay:
 * - Timer follows `betting_deadline` (real remaining time, server clock).
 * - Bets are admitted only while BETTING_OPEN *and* before the deadline.
 * - Deadline passed / BETTING_CLOSED / COUNTDOWN → closed banner.
 *
 * @param {{
 *   status: string | null,
 *   round?: Record<string, unknown> | null,
 * }} args
 */
export function useBettingOverlayState({ status, round = null }) {
  const [now, setNow] = useState(() => Date.now())
  const roundId = round?.id != null ? String(round.id) : null
  const bettingDeadline = round?.betting_deadline ?? null
  const isBettingOpen = status === RoundState.BETTING_OPEN

  useEffect(() => {
    if (!isBettingOpen || !roundId) return undefined

    if (!openedAtByRoundId.has(roundId)) {
      openedAtByRoundId.set(roundId, Date.now())
    }
    for (const key of openedAtByRoundId.keys()) {
      if (key !== roundId) openedAtByRoundId.delete(key)
    }

    return undefined
  }, [isBettingOpen, roundId])

  useEffect(() => {
    if (!isBettingOpen) return undefined
    const id = setInterval(() => setNow(Date.now()), 200)
    queueMicrotask(() => setNow(Date.now()))
    return () => clearInterval(id)
  }, [isBettingOpen, roundId])

  return useMemo(() => {
    if (isBettingOpen) {
      const deadlineMs = parseTimestampMs(bettingDeadline)
      const alignedNow = serverNowMs(now)
      if (deadlineMs != null && alignedNow >= deadlineMs) {
        return closedState()
      }

      let secondsLeft = secondsUntilDeadline(bettingDeadline, alignedNow)
      if (secondsLeft == null) {
        const openedAt = (roundId && openedAtByRoundId.get(roundId)) || now
        const elapsed = Math.floor((now - openedAt) / 1000)
        secondsLeft = Math.max(0, BETTING_WINDOW_SECONDS - elapsed)
      }

      // Without a deadline the DB status stays authoritative — at 0s keep
      // showing BETS CLOSING until BETTING_CLOSED arrives.
      const phase =
        secondsLeft <= BETTING_CLOSING_THRESHOLD_SECONDS
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
        canPlaceBets: true,
        disabled: false,
      }
    }

    if (
      status === RoundState.BETTING_CLOSED ||
      status === RoundState.COUNTDOWN
    ) {
      return closedState()
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
  }, [isBettingOpen, status, roundId, bettingDeadline, now])
}
