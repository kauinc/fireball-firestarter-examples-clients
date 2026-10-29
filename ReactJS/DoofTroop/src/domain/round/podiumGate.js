import { RoundState } from './roundStates.js'

const RESULT_ACCEPTED_STATUSES = Object.freeze([
  RoundState.RESULTS_RECORDED,
  RoundState.FINISHED,
])

/**
 * Confirmed race result: terminal-result status + three podium placements.
 * Does not mean Unreal has entered the podium camera yet.
 *
 * @param {Record<string, unknown> | null | undefined} round
 * @returns {boolean}
 */
export function isResultAccepted(round) {
  if (!round || typeof round.status !== 'string') return false
  if (!RESULT_ACCEPTED_STATUSES.includes(round.status)) return false
  return (
    Array.isArray(round.placements) && round.placements.length === 3
  )
}

/**
 * Unreal (or server) has started / entered the podium presentation.
 * Prefer `podium_transition_started_at`; `podium_entered_at` covers current rows.
 *
 * @param {Record<string, unknown> | null | undefined} round
 * @returns {boolean}
 */
export function isPodiumStarted(round) {
  if (!round) return false
  return (
    round.podium_transition_started_at != null ||
    round.podium_entered_at != null
  )
}

/**
 * Show the winner / settlement HUD only when results are accepted and the
 * podium presentation has started. Never use FINISHED alone — recovery can
 * finalize without Unreal showing the podium.
 *
 * @param {Record<string, unknown> | null | undefined} round
 * @returns {boolean}
 */
export function shouldShowWinners(round) {
  return isResultAccepted(round) && isPodiumStarted(round)
}

/**
 * Keep the race HUD after the race ends until Unreal starts the podium.
 * Does not require placements yet (avoids a flash if status arrives first).
 * Never overlaps the winner HUD.
 *
 * @param {string | null | undefined} status
 * @param {Record<string, unknown> | null | undefined} round
 * @returns {boolean}
 */
export function shouldShowRaceOverlay(status, round = null) {
  if (status === RoundState.RACE_RUNNING) return true
  if (shouldShowWinners(round)) return false
  // Hold through RESULTS_RECORDED until a podium timestamp appears.
  return (
    status === RoundState.RESULTS_RECORDED && !isPodiumStarted(round)
  )
}

/**
 * Drop a latched settlement snapshot when the live row is no longer on podium
 * (e.g. recovery rewrite cleared podium stamps while still RESULTS_RECORDED).
 * Prevents race-hold + latched settlement from mounting together.
 *
 * @param {string | null | undefined} status
 * @param {Record<string, unknown> | null | undefined} round
 * @returns {boolean}
 */
export function shouldClearSettlementLatch(status, round = null) {
  if (shouldShowWinners(round)) return false
  if (status === RoundState.RESULTS_RECORDED && !isPodiumStarted(round)) {
    return true
  }
  // Recovery-style FINISHED without podium — do not keep a prior latch.
  if (status === RoundState.FINISHED && !isPodiumStarted(round)) {
    return true
  }
  return false
}
