import { DOOF_COLORS, DOOF_PATTERNS, DOOF_ACCESSORIES } from './doofs.js'

/**
 * Unreal / Supabase `doof_index` (0–17) — authoritative decode:
 *
 *   colorIndex     = doofIndex % 6          → Red…Magenta(Pink)
 *   patternIndex   = floor(doofIndex / 6)   → Dots, Solid, Stripes
 *   accessoryIndex = (doofIndex + patternIndex) % 2 → Hat, Glasses
 *
 *  0–5:  Dots     Red…Pink
 *  6–11: Solid    Red…Pink
 * 12–17: Stripes  Red…Pink
 *
 * Board `DOOF_PATTERNS` must stay in this same order so landscape cell
 * order matches the index.
 *
 * @param {unknown} index
 * @returns {{ color: string, pattern: string, accessory: string } | null}
 */
export function doofFromIndex(index) {
  const i = Number(index)
  if (!Number.isInteger(i) || i < 0 || i >= DOOF_COLORS.length * DOOF_PATTERNS.length) {
    return null
  }
  const colorIndex = i % DOOF_COLORS.length
  const patternIndex = Math.floor(i / DOOF_COLORS.length)
  const accessoryIndex = (i + patternIndex) % 2
  return {
    color: DOOF_COLORS[colorIndex],
    pattern: DOOF_PATTERNS[patternIndex],
    accessory: DOOF_ACCESSORIES[accessoryIndex],
  }
}

/**
 * Format Unreal `finish_time` (seconds, fractional) as `SS:CC` like the podium UI.
 * @param {unknown} finishTime
 * @returns {string | null}
 */
export function formatFinishTimeLabel(finishTime) {
  const t = Number(finishTime)
  if (!Number.isFinite(t) || t < 0) return null
  // Round on total centiseconds so 12.996 carries to 13:00 (not 12:99).
  const totalCentis = Math.round(t * 100)
  const whole = Math.floor(totalCentis / 100)
  const centis = totalCentis % 100
  return `${whole}:${String(centis).padStart(2, '0')}`
}

/**
 * Format `finisher_times_ms` (milliseconds) as `SS:CC` for the podium UI.
 * @param {unknown} finishTimeMs
 * @returns {string | null}
 */
export function formatFinishTimeMsLabel(finishTimeMs) {
  const ms = Number(finishTimeMs)
  if (!Number.isFinite(ms) || ms < 0) return null
  return formatFinishTimeLabel(ms / 1000)
}
