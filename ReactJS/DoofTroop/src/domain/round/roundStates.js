/**
 * Doof Troop round lifecycle as written into Supabase `rounds.status`.
 * LiveKit carries A/V only — `status` drives most overlays.
 * The winner / settlement HUD also requires a podium timestamp
 * (`podium_transition_started_at` or `podium_entered_at`); do not open it
 * from FINISHED alone (recovery may finalize without Unreal podium).
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
