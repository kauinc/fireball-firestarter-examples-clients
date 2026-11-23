/** Map in-game place tokens to i18n keys. */
export const PLACE_LABEL_KEYS = Object.freeze({
  '1st': 'label_place_1st',
  '2nd': 'label_place_2nd',
  '3rd': 'label_place_3rd',
})

/** Map accessory ids to i18n keys. */
export const ACCESSORY_LABEL_KEYS = Object.freeze({
  Hats: 'label_hats',
  Glasses: 'label_glasses',
})

/** Map color ids to i18n keys. */
export const COLOR_LABEL_KEYS = Object.freeze({
  Red: 'label_color_red',
  Yellow: 'label_color_yellow',
  Green: 'label_color_green',
  Cyan: 'label_color_cyan',
  Blue: 'label_color_blue',
  Pink: 'label_color_pink',
})

/** Map pattern ids to i18n keys. */
export const PATTERN_LABEL_KEYS = Object.freeze({
  Dots: 'label_pattern_dots',
  Solid: 'label_pattern_solid',
  Stripes: 'label_pattern_stripes',
})

/**
 * @param {(key: string, vars?: Record<string, string | number>) => string} t
 * @param {string} place
 */
export function translatePlace(t, place) {
  const key = PLACE_LABEL_KEYS[place]
  return key ? t(key) : place
}

/**
 * @param {(key: string, vars?: Record<string, string | number>) => string} t
 * @param {string} accessory
 */
export function translateAccessory(t, accessory) {
  const key = ACCESSORY_LABEL_KEYS[accessory]
  return key ? t(key) : accessory
}

/**
 * @param {(key: string, vars?: Record<string, string | number>) => string} t
 * @param {string} color
 */
export function translateColor(t, color) {
  const key = COLOR_LABEL_KEYS[color]
  return key ? t(key) : color
}

/**
 * @param {(key: string, vars?: Record<string, string | number>) => string} t
 * @param {string} pattern
 */
export function translatePattern(t, pattern) {
  const key = PATTERN_LABEL_KEYS[pattern]
  return key ? t(key) : pattern
}
