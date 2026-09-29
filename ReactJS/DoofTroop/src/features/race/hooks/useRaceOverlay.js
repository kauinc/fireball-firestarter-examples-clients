import { useEffect, useState } from 'react'
import { RoundState } from '../../../domain/round/index.js'
import { resolveWallClockMs } from '../../../shared/supabase/roundTimestamps.js'

/**
 * Race HUD visibility from `rounds.status`.
 * Prototype: RACE_RUNNING only (TRACK_READY stays clear for Unreal countdown).
 *
 * @param {{ status: string | null, round?: Record<string, unknown> | null }} args
 */
export function useRaceOverlayState({ status, round = null }) {
  const isRace = status === RoundState.RACE_RUNNING
  const raceKey = `${round?.id ?? ''}:${status ?? ''}`

  return {
    isRaceUiVisible: isRace,
    raceKey,
    raceStartedAt: round?.race_started_at ?? null,
    updatedAt: round?.updated_at ?? null,
  }
}

/**
 * Elapsed race clock as MM:SS.
 * Uses Supabase `race_started_at`, corrected against `updated_at` when Unreal’s
 * clock is ahead of wall time (otherwise reload always showed 00:00).
 *
 * @param {{
 *   active: boolean,
 *   raceStartedAt?: string | null,
 *   updatedAt?: string | null,
 *   raceKey?: string,
 * }} args
 */
export function useRaceElapsed({
  active,
  raceStartedAt = null,
  updatedAt = null,
  raceKey = '',
}) {
  const [now, setNow] = useState(null)
  const [startedAt, setStartedAt] = useState(null)

  useEffect(() => {
    if (!active) {
      queueMicrotask(() => {
        setStartedAt(null)
        setNow(null)
      })
      return undefined
    }

    queueMicrotask(() => {
      const openMs = Date.now()
      const wallStart = resolveWallClockMs(raceStartedAt, updatedAt, openMs)
      setNow(openMs)
      setStartedAt((prev) => wallStart ?? prev ?? openMs)

      if (import.meta.env.DEV) {
        console.debug('[race-timer]', {
          raceStartedAt,
          updatedAt,
          wallStart: wallStart != null ? new Date(wallStart).toISOString() : null,
          elapsedSec:
            wallStart != null ? Math.floor((openMs - wallStart) / 1000) : null,
        })
      }
    })
    return undefined
  }, [active, raceKey, raceStartedAt, updatedAt])

  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => setNow(Date.now()), 200)
    queueMicrotask(() => setNow(Date.now()))
    return () => clearInterval(id)
  }, [active])

  const elapsedMs =
    active && startedAt != null && now != null
      ? Math.max(0, now - startedAt)
      : 0
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const label = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return { label, totalSeconds }
}

/**
 * Prototype potential-win flicker (random €0–1000 every few seconds).
 * @param {{ active: boolean, intervalMs?: number, maxAmount?: number }} args
 */
export function useMockPotentialWin({
  active,
  intervalMs = 3000,
  maxAmount = 1000,
}) {
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    if (!active) {
      queueMicrotask(() => setAmount(0))
      return undefined
    }

    function roll() {
      const cents = Math.floor(Math.random() * (maxAmount * 100 + 1))
      setAmount(cents / 100)
    }

    queueMicrotask(roll)
    const id = setInterval(roll, intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs, maxAmount])

  return amount
}
