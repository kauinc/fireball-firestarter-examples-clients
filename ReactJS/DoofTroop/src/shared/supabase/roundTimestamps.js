/**
 * Server UTC ↔ client clock helpers for deadline / race timers.
 *
 * Client `Date.now()` can lag Postgres by ~1–2s. Live play corrects that from
 * Realtime stamps; a full reload used to drop the offset and show a longer
 * betting countdown. Offset is persisted in sessionStorage and refreshed from
 * Realtime (and HTTP Date when the browser exposes it).
 */

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabase.js'

const OFFSET_STORAGE_KEY = 'doof_server_clock_offset_ms'

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseTimestampMs(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Date.parse(typeof value === 'string' ? value : String(value))
  return Number.isFinite(parsed) ? parsed : null
}

/** Ignore absurd NTP / bad-stamp outliers. */
const MAX_OFFSET_ABS_MS = 24 * 60 * 60 * 1000

/** `serverNow ≈ Date.now() + offset`. */
let serverClockOffsetMs = readStoredOffset()
let hasServerClockOffset = serverClockOffsetMs != null

function readStoredOffset() {
  try {
    const raw = sessionStorage.getItem(OFFSET_STORAGE_KEY)
    if (raw == null || raw === '') return null
    const value = Number(raw)
    if (!Number.isFinite(value) || Math.abs(value) > MAX_OFFSET_ABS_MS) {
      return null
    }
    return value
  } catch {
    return null
  }
}

function persistOffset(offsetMs) {
  try {
    sessionStorage.setItem(OFFSET_STORAGE_KEY, String(offsetMs))
  } catch {
    // private mode / quota — ignore
  }
}

/**
 * Record a server timestamp observed at `clientNowMs` (receive time).
 *
 * @param {unknown} serverTs
 * @param {number} [clientNowMs]
 * @param {{ force?: boolean }} [opts]
 */
export function noteServerClockSample(
  serverTs,
  clientNowMs = Date.now(),
  opts = {},
) {
  const serverMs = parseTimestampMs(serverTs)
  if (serverMs == null) return

  const offset = serverMs - clientNowMs
  if (Math.abs(offset) > MAX_OFFSET_ABS_MS) return

  if (!hasServerClockOffset || opts.force) {
    serverClockOffsetMs = offset
    hasServerClockOffset = true
    persistOffset(offset)
  }
}

/**
 * Best-effort server UTC milliseconds.
 * Uses the last Realtime/HTTP/session offset; otherwise plain `Date.now()`.
 *
 * @param {number} [clientNowMs]
 * @returns {number}
 */
export function serverNowMs(clientNowMs = Date.now()) {
  return clientNowMs + (hasServerClockOffset ? serverClockOffsetMs : 0)
}

const HTTP_DATE_TIMEOUT_MS = 3000

/**
 * HTTP `Date` is truncated to whole seconds, so the true server time lies in
 * [Date, Date + 1s). Use the midpoint to avoid a systematic −0.5s bias.
 */
const HTTP_DATE_RESOLUTION_MIDPOINT_MS = 500

/**
 * Probe REST `Date` when CORS exposes it (bonus sync on reload).
 * Bounded by a timeout so a hung request never blocks the round fetch.
 *
 * @returns {Promise<boolean>}
 */
export async function syncServerClockFromHttpDate() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HTTP_DATE_TIMEOUT_MS)
  try {
    const wall0 = Date.now()
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rounds?select=id&limit=1`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      },
    )
    const wall1 = Date.now()
    const dateHdr = res.headers.get('date')
    if (!dateHdr) return false

    const serverMs = Date.parse(dateHdr)
    if (!Number.isFinite(serverMs)) return false

    const clientMid = Math.round((wall0 + wall1) / 2)
    noteServerClockSample(
      serverMs + HTTP_DATE_RESOLUTION_MIDPOINT_MS,
      clientMid,
      { force: true },
    )
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}
