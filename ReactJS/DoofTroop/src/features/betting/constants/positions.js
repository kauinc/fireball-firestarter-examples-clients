import {
  positionsForMetal,
  scopeForMetal,
} from '../../../shared/balancing/index.js'

export { positionsForMetal, scopeForMetal }

/** UI labels for Crazy Combo slots (internal keys stay 1st / 2nd / 3rd). */
export const POSITION_LABELS = Object.freeze({
  '1st': '1st',
  '2nd': '2nd',
  '3rd': '3rd',
})

/** Fill width of All position bar inside the inset track (P1 / P2 / P3). */
export const POSITION_FILL_WIDTH = Object.freeze({
  '1st': 'calc(33.333% - 3px * var(--hud-scale))',
  '2nd': 'calc(66.666% + 4px * var(--hud-scale))',
  '3rd': '100%',
})

/** Pointer center at the fill edge inside the frame. */
export const POSITION_THUMB_LEFT = Object.freeze({
  '1st': 'calc(32.666% - 3px * var(--hud-scale))',
  '2nd': 'calc(65.333% + 4px * var(--hud-scale))',
  '3rd': '96%',
})

/**
 * Union of podium places covered by every metal face on a bet.
 * @param {ReadonlyArray<{ metal?: string }> | null | undefined} chips
 */
export function positionsForChips(chips) {
  const set = new Set()
  for (const chip of chips ?? []) {
    for (const place of positionsForMetal(chip?.metal)) set.add(place)
  }
  if (set.size === 0) return positionsForMetal('gold')
  return ['1st', '2nd', '3rd'].filter((place) => set.has(place))
}

/**
 * @param {string[]} selectedPositions
 * @returns {'1st' | '2nd' | '3rd'}
 */
export function maxSelectedPosition(selectedPositions) {
  let current = '1st'
  for (const pos of ['1st', '2nd', '3rd']) {
    if (selectedPositions.includes(pos)) current = pos
  }
  return current
}

/**
 * Expand position selection up to the tapped seat (1st ⊂ 2nd ⊂ 3rd).
 * @param {string} pos
 * @returns {string[] | null}
 */
export function positionsUpTo(pos) {
  const index = ['1st', '2nd', '3rd'].indexOf(pos)
  if (index < 0) return null
  return ['1st', '2nd', '3rd'].slice(0, index + 1)
}
