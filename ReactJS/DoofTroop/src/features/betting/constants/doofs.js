export const DOOF_COLORS = Object.freeze([
  'Red',
  'Yellow',
  'Green',
  'Cyan',
  'Blue',
  'Pink',
])

export const DOOF_PATTERNS = Object.freeze(['Stripes', 'Solid', 'Dots'])

export const DOOF_ACCESSORIES = Object.freeze(['Hats', 'Glasses'])

/** Allowed stake steps for +/- . */
export const CHIP_VALUES = Object.freeze([
  0.2, 0.4, 0.6, 0.8, 1, 2, 5, 10, 20, 50,
])

export const DEFAULT_CHIP_VALUE = 0.2

/** Cap stake on a single bet target (temporary until table limits land). */
export const MAX_BET_PER_TARGET = 100

/** Largest chip denomination that does not exceed `maxAmount` (or null). */
export function largestChipAtMost(maxAmount) {
  if (!(maxAmount > 0)) return null
  let best = null
  for (const value of CHIP_VALUES) {
    if (value <= maxAmount) best = value
    else break
  }
  return best
}

/** Visual chip metals in the footer tray (left → right). */
export const CHIP_METALS = Object.freeze(['silver', 'gold', 'bronze'])

/** Board stack order: bottom → top. */
export const CHIP_STACK_ORDER = Object.freeze(['bronze', 'silver', 'gold'])

/** Labels drawn above each tray chip. */
export const CHIP_METAL_LABELS = Object.freeze({
  silver: 'TOP 2',
  gold: 'WINNER',
  bronze: 'TOP 3',
})

export const POSITION_OPTIONS = Object.freeze(['1st', '2nd', '3rd'])
