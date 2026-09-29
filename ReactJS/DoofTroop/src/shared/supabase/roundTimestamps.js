/**
 * Unreal writes `created_at` / `race_started_at` / etc. with a clock that can be
 * hours ahead of real UTC, while Postgres `updated_at` is server-correct.
 *
 * Live check (2026-09-29): race_started_at ≈ now+2h, updated_at ≈ now.
 * Trusting raw Unreal stamps then rejecting “future” values made timers
 * fall back to Date.now() → always start at 00:00 after reload.
 */

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

/**
 * Map an Unreal-authored timestamp onto client/wall time.
 * When the stamp is not in the future, use it as-is.
 * When it is ahead of the client clock, subtract skew vs `updated_at`.
 *
 * @param {unknown} unrealTs - created_at | race_started_at | …
 * @param {unknown} updatedAt - Postgres updated_at (real UTC)
 * @param {number} [nowMs]
 * @returns {number | null}
 */
export function resolveWallClockMs(unrealTs, updatedAt, nowMs = Date.now()) {
  const unrealMs = parseTimestampMs(unrealTs)
  if (unrealMs == null) return null

  // Stamp looks plausible on the client clock.
  if (unrealMs <= nowMs + 1500) return unrealMs

  const updatedMs = parseTimestampMs(updatedAt)
  if (updatedMs == null) return null

  const skewMs = unrealMs - updatedMs
  // Large positive skew ⇒ Unreal clock ahead of Postgres; correct it.
  if (skewMs > 30_000) {
    return unrealMs - skewMs
  }

  return unrealMs
}
