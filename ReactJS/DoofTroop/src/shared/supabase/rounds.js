import { supabase } from './client.js'
import { RoundState } from '../../domain/round/roundStates.js'

const ROUND_COLUMNS = [
  'id',
  'round_number',
  'status',
  'created_at',
  'updated_at',
  'betting_closed_at',
  'race_started_at',
  'finished_at',
  'placements',
  'winner_doof_index',
  'race_duration',
  'result_status',
  'runtime_node_id',
].join(',')

const REALTIME_CHANNEL_PREFIX = 'rounds_realtime'

/** Later statuses win for the same round id (guards stale Realtime/REST). */
const STATUS_RANK = Object.freeze({
  [RoundState.ROUND_NONE]: 0,
  [RoundState.ROUND_CREATED]: 1,
  [RoundState.BETTING_OPEN]: 2,
  [RoundState.BETTING_CLOSED]: 3,
  [RoundState.TRACK_READY]: 4,
  [RoundState.RACE_RUNNING]: 5,
  [RoundState.RESULTS_SENT]: 6,
  [RoundState.ROUND_COMPLETED]: 7,
  [RoundState.ROUND_CANCELLED_OPERATOR]: 7,
  [RoundState.ROUND_CANCELLED_RUNTIME]: 7,
})

/**
 * Latest round by round_number (Unreal writes here).
 * @returns {Promise<{ data: Record<string, unknown> | null, error: Error | null }>}
 */
export async function fetchLatestRound() {
  const { data, error } = await supabase
    .from('rounds')
    .select(ROUND_COLUMNS)
    .order('round_number', { ascending: false })
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
  const { data, error } = await supabase
    .from('rounds')
    .select(ROUND_COLUMNS)
    .not('winner_doof_index', 'is', null)
    .order('round_number', { ascending: false })
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

/**
 * Whether `next` should replace `current` as the active round snapshot.
 * - Newer round_number wins.
 * - Same id: prefer later status rank, then later updated_at.
 * - Malformed round_number: reject (do not overwrite a valid current).
 *
 * @param {Record<string, unknown> | null | undefined} next
 * @param {Record<string, unknown> | null | undefined} current
 */
export function shouldApplyRound(next, current) {
  if (!next?.id) return false
  if (!current?.id) return true

  if (next.id === current.id) {
    const nextRank = statusRank(next.status)
    const curRank = statusRank(current.status)
    if (nextRank !== curRank) return nextRank >= curRank
    return updatedAtMs(next) >= updatedAtMs(current)
  }

  const nextNum = Number(next.round_number)
  const curNum = Number(current.round_number)
  if (Number.isFinite(nextNum) && Number.isFinite(curNum)) {
    return nextNum >= curNum
  }

  // Do not replace a known round with a malformed row.
  return false
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
      { event: '*', schema: 'public', table: 'rounds' },
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
 * Realtime INSERT/UPDATE on `public.rounds` (shared channel, no poll).
 * Safe to call from multiple hooks — listeners are multiplexed.
 *
 * @param {(payload: { eventType: string, new: Record<string, unknown> | null }) => void} onChange
 * @param {(status: string, error: Error | null) => void} [onStatus]
 * @returns {{ unsubscribe: () => void }}
 */
export function subscribeToRounds(onChange, onStatus) {
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
