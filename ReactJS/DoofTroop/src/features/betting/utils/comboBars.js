import { uiAssets } from '../assets/uiAssets.js'

/**
 * Inactive chrome for Hats/Glasses while regular COMBO pick mode is active.
 */
export function comboAccessoryPickBarBackground() {
  return uiAssets.hatsGlassesBarComboActive
}

/**
 * Pick-mode chrome for color/pattern labels.
 */
export function comboPickBarBackground() {
  return uiAssets.colorPatternBar
}

/**
 * Victor icon shown in the COMBO bar after a pick (red.png, dots.png, hats.png, …).
 */
export function getComboBarIcon(kind, key) {
  return uiAssets.comboBarIcons[kind]?.[key]
}

export function getComboBarIconVariant(kind) {
  if (kind === 'accessories') return 'accessory'
  return 'bar'
}

export function getComboBarState(comboActive) {
  return { highlight: comboActive, dimmed: false }
}
