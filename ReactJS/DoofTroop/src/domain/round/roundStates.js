/**
 * Doof Troop round lifecycle as written into Supabase `rounds.status`.
 * LiveKit carries A/V only — `status` is the source of truth for overlays.
 * Do not infer overlay screens from timestamps alone.
 * `presentation_phase` may guide presentation, but bet admission uses status + deadline.
 */
export const RoundState = Object.freeze({
  CREATED: 'CREATED',
  BETTING_OPEN: 'BETTING_OPEN',
  BETTING_CLOSED: 'BETTING_CLOSED',
  COUNTDOWN: 'COUNTDOWN',
  RACE_RUNNING: 'RACE_RUNNING',
  RESULTS_RECORDED: 'RESULTS_RECORDED',
  FINISHED: 'FINISHED',
  CANCELLED: 'CANCELLED',
})
