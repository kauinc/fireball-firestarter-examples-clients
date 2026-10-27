import { supabase, SUPABASE_NOT_CONFIGURED_MESSAGE } from './client.js'
import { RoundState } from '../../domain/round/roundStates.js'
import { DOOF_CHANNEL_ID } from '../config/supabase.js'

const ROUND_COLUMNS = [
  'id',
  'channel_id',
  'status',
  'presentation_phase',
  'track_id',
  'track_name',
  'level_name',
  'weather',
  'time_of_day',
  'race_placements',
  'placements',
  'finisher_times_ms',
  'race_elapsed_ms',
  'race_updated_at',
  'betting_deadline',
  'podium_deadline',
  'expires_at',
  'created_at',
  'betting_opened_at',
  'betting_closed_at',
  'countdown_started_at',
  'race_started_at',
  'results_recorded_at',
  'podium_entered_at',
  'finished_at',
  'cancelled_at',
  'cancellation_reason',
  'recovery_required',
  'recovery_reason',
  'recovery_detected_at',
  'round_version',
  'updated_at',
  'protocol_version',
  'profile_version',
  'game_rules_version',
  'test_money_only',
].join(',')

const REALTIME_CHANNEL_PREFIX = 'rounds_realtime'

const RESULT_STATUSES = Object.freeze([
  RoundState.RESULTS_RECORDED,
  RoundState.FINISHED,
])

/**
 * Later statuses win for the same round id when `round_version` is missing
 * (guards stale Realtime/REST).
 */
const STATUS_RANK = Object.freeze({
  [RoundState.CREATED]: 1,
  [RoundState.BETTING_OPEN]: 2,
  [RoundState.BETTING_CLOSED]: 3,
  [RoundState.COUNTDOWN]: 4,
  [RoundState.RACE_RUNNING]: 5,
  [RoundState.RESULTS_RECORDED]: 6,
  [RoundState.FINISHED]: 7,
  [RoundState.CANCELLED]: 7,
})

/**
 * Latest round for the configured development channel.
 * @returns {Promise<{ data: Record<string, unknown> | null, error: Error | null }>}
 */
export async function fetchLatestRound() {
  if (!supabase) {
    return { data: null, error: new Error(SUPABASE_NOT_CONFIGURED_MESSAGE) }
  }
  const { data, error } = await supabase
    .from('rounds')
    .select(ROUND_COLUMNS)
    .eq('channel_id', DOOF_CHANNEL_ID)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { data: data ?? null, error: error ?? null }
}

/**
 * Recent finished rounds with podium placements (newest first).
 * Used to seed the History panel from real results.
 *
 * @param {number} [limit=10]
 * @returns {Promise<{ data: Record<string, unknown>[], error: Error | null }>}
 */
export async function fetchRecentResultRounds(limit = 10) {
  if (!supabase) {
    return { data: [], error: new Error(SUPABASE_NOT_CONFIGURED_MESSAGE) }
  }
  const { data, error } = await supabase
    .from('rounds')
    .select(ROUND_COLUMNS)
    .eq('channel_id', DOOF_CHANNEL_ID)
    .in('status', [...RESULT_STATUSES])
    .not('placements', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data: data ?? [], error: error ?? null }
}

function statusRank(status) {
  if (typeof status !== 'string') return -1
  return STATUS_RANK[status] ?? -1
}

function updatedAtMs(row) {
  const raw = row?.updated_at ?? row?.created_at
  if (typeof raw !== 'string') return 0
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : 0
}

function raceUpdatedAtMs(row) {
  const raw = row?.race_updated_at
  if (typeof raw !== 'string') return 0
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : 0
}

function roundVersion(row) {
  const v = Number(row?.round_version)
  return Number.isFinite(v) ? v : -1
}

function createdAtMs(row) {
  const raw = row?.created_at
  if (typeof raw !== 'string') return 0
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : 0
}

/**
 * Whether `next` should replace `current` as the active round snapshot.
 * - Newer created_at (different id) wins.
 * - Same id: `round_version` is authoritative when both rows carry it (the
 *   server may legitimately move status backwards, e.g. recovery); otherwise
 *   later status rank wins. Ties fall back to race_updated_at / updated_at so
 *   leaderboard progress is not discarded.
 *
 * @param {Record<string, unknown> | null | undefined} next
 * @param {Record<string, unknown> | null | undefined} current
 */
export function shouldApplyRound(next, current) {
  if (!next?.id) return false
  if (!current?.id) return true

  if (next.id === current.id) {
    const nextVer = roundVersion(next)
    const curVer = roundVersion(current)
    if (nextVer >= 0 && curVer >= 0 && nextVer !== curVer) {
      return nextVer > curVer
    }

    const nextRank = statusRank(next.status)
    const curRank = statusRank(current.status)
    if (nextRank !== curRank) return nextRank >= curRank

    const nextRace = raceUpdatedAtMs(next)
    const curRace = raceUpdatedAtMs(current)
    if (nextRace !== curRace) return nextRace >= curRace

    return updatedAtMs(next) >= updatedAtMs(current)
  }

  // Different round: prefer the newer created_at; never replace with unknown age.
  const nextCreated = createdAtMs(next)
  const curCreated = createdAtMs(current)
  if (nextCreated > 0 && curCreated > 0) {
    return nextCreated >= curCreated
  }

  return nextCreated > 0
}

/** @type {{
 *   channel: ReturnType<typeof supabase.channel>,
 *   onChange: Set<(payload: { eventType: string, new: Record<string, unknown> | null }) => void>,
 *   onStatus: Set<(status: string, error: Error | null) => void>,
 * } | null} */
let sharedRoundsRealtime = null
let roundsRealtimeSeq = 0

function ensureRoundsRealtime() {
  if (sharedRoundsRealtime) return sharedRoundsRealtime

  const onChange = new Set()
  const onStatus = new Set()
  roundsRealtimeSeq += 1

  // Unique topic each time the shared channel is (re)created. Reusing a topic
  // that is still subscribed and calling .on() again throws in supabase-js.
  const channel = supabase
    .channel(`${REALTIME_CHANNEL_PREFIX}_${roundsRealtimeSeq}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rounds',
        filter: `channel_id=eq.${DOOF_CHANNEL_ID}`,
      },
      (payload) => {
        const event = {
          eventType: payload.eventType,
          new: payload.new ?? null,
        }
        for (const listener of onChange) listener(event)
      },
    )
    .subscribe((status, err) => {
      for (const listener of onStatus) listener(status, err ?? null)
    })

  sharedRoundsRealtime = { channel, onChange, onStatus }
  return sharedRoundsRealtime
}

/**
 * Realtime INSERT/UPDATE on `public.rounds` for the configured channel.
 * Safe to call from multiple hooks — listeners are multiplexed.
 *
 * @param {(payload: { eventType: string, new: Record<string, unknown> | null }) => void} onChange
 * @param {(status: string, error: Error | null) => void} [onStatus]
 * @returns {{ unsubscribe: () => void }}
 */
export function subscribeToRounds(onChange, onStatus) {
  if (!supabase) {
    let active = true
    queueMicrotask(() => {
      if (active) {
        onStatus?.('CHANNEL_ERROR', new Error(SUPABASE_NOT_CONFIGURED_MESSAGE))
      }
    })
    return {
      unsubscribe() {
        active = false
      },
    }
  }

  const shared = ensureRoundsRealtime()
  shared.onChange.add(onChange)
  if (onStatus) shared.onStatus.add(onStatus)

  return {
    unsubscribe() {
      shared.onChange.delete(onChange)
      if (onStatus) shared.onStatus.delete(onStatus)

      if (shared.onChange.size === 0 && sharedRoundsRealtime === shared) {
        sharedRoundsRealtime = null
        supabase.removeChannel(shared.channel)
      }
    },
  }
}
