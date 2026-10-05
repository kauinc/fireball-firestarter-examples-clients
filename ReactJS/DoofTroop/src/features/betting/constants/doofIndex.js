import { DOOF_COLORS, DOOF_PATTERNS } from './doofs.js'

/**
 * Unreal / Supabase `doof_index` (0–17) matches the landscape betting board:
 * pattern rows × color columns — same order as `DoofGrid` landscape cells.
 *
 *  0–5:  Stripes  Red…Pink
 *  6–11: Solid    Red…Pink
 * 12–17: Dots     Red…Pink
 *
 * @param {unknown} index
 * @returns {{ color: string, pattern: string } | null}
 */
export function doofFromIndex(index) {
  const i = Number(index)
  if (!Number.isInteger(i) || i < 0 || i >= DOOF_COLORS.length * DOOF_PATTERNS.length) {
    return null
  }
  const patternIndex = Math.floor(i / DOOF_COLORS.length)
  const colorIndex = i % DOOF_COLORS.length
  return {
    color: DOOF_COLORS[colorIndex],
    pattern: DOOF_PATTERNS[patternIndex],
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
  const whole = Math.floor(t)
  const centis = Math.min(99, Math.round((t - whole) * 100))
  return `${whole}:${String(centis).padStart(2, '0')}`
}
