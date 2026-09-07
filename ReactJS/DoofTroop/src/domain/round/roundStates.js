/**
 * Doof Troop round lifecycle as written by Unreal into Supabase `rounds.status`.
 * LiveKit carries A/V only — `status` is the source of truth for overlays.
 * Do not infer overlay screens from timestamps.
 */
export const RoundState = Object.freeze({
  ROUND_NONE: 'ROUND_NONE',
  ROUND_CREATED: 'ROUND_CREATED',
  BETTING_OPEN: 'BETTING_OPEN',
  BETTING_CLOSED: 'BETTING_CLOSED',
  TRACK_READY: 'TRACK_READY',
  RACE_RUNNING: 'RACE_RUNNING',
  RESULTS_SENT: 'RESULTS_SENT',
  ROUND_COMPLETED: 'ROUND_COMPLETED',
  ROUND_CANCELLED_OPERATOR: 'ROUND_CANCELLED_OPERATOR',
  ROUND_CANCELLED_RUNTIME: 'ROUND_CANCELLED_RUNTIME',
})
