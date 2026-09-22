/**
 * Doof sprites used by the betting board roster + history picks.
 * Only the 18 board cells are bundled (WebP).
 */
import redDotsHats from '../../../assets/doofs/Red_Dots_Hats.webp'
import yellowDotsGlasses from '../../../assets/doofs/Yellow_Dots_Glasses.webp'
import greenDotsHats from '../../../assets/doofs/Green_Dots_Hats.webp'
import cyanDotsGlasses from '../../../assets/doofs/Cyan_Dots_Glasses.webp'
import blueDotsHats from '../../../assets/doofs/Blue_Dots_Hats.webp'
import magentaDotsGlasses from '../../../assets/doofs/Magenta_Dots_Glasses.webp'
import redSolidGlasses from '../../../assets/doofs/Red_Solid_Glasses.webp'
import yellowSolidHats from '../../../assets/doofs/Yellow_Solid_Hats.webp'
import greenSolidGlasses from '../../../assets/doofs/Green_Solid_Glasses.webp'
import cyanSolidHats from '../../../assets/doofs/Cyan_Solid_Hats.webp'
import blueSolidGlasses from '../../../assets/doofs/Blue_Solid_Glasses.webp'
import magentaSolidHats from '../../../assets/doofs/Magenta_Solid_Hats.webp'
import redStripesHats from '../../../assets/doofs/Red_Stripes_Hats.webp'
import yellowStripesGlasses from '../../../assets/doofs/Yellow_Stripes_Glasses.webp'
import greenStripesHats from '../../../assets/doofs/Green_Stripes_Hats.webp'
import cyanStripesGlasses from '../../../assets/doofs/Cyan_Stripes_Glasses.webp'
import blueStripesHats from '../../../assets/doofs/Blue_Srtipes_Hats.webp'
import magentaStripesGlasses from '../../../assets/doofs/Magenta_Stripes_Glasses.webp'

const BOARD_ROSTER = Object.freeze({
  'Red-Dots': { src: redDotsHats, accessory: 'Hats' },
  'Yellow-Dots': { src: yellowDotsGlasses, accessory: 'Glasses' },
  'Green-Dots': { src: greenDotsHats, accessory: 'Hats' },
  'Cyan-Dots': { src: cyanDotsGlasses, accessory: 'Glasses' },
  'Blue-Dots': { src: blueDotsHats, accessory: 'Hats' },
  'Pink-Dots': { src: magentaDotsGlasses, accessory: 'Glasses' },

  'Red-Solid': { src: redSolidGlasses, accessory: 'Glasses' },
  'Yellow-Solid': { src: yellowSolidHats, accessory: 'Hats' },
  'Green-Solid': { src: greenSolidGlasses, accessory: 'Glasses' },
  'Cyan-Solid': { src: cyanSolidHats, accessory: 'Hats' },
  'Blue-Solid': { src: blueSolidGlasses, accessory: 'Glasses' },
  'Pink-Solid': { src: magentaSolidHats, accessory: 'Hats' },

  'Red-Stripes': { src: redStripesHats, accessory: 'Hats' },
  'Yellow-Stripes': { src: yellowStripesGlasses, accessory: 'Glasses' },
  'Green-Stripes': { src: greenStripesHats, accessory: 'Hats' },
  'Cyan-Stripes': { src: cyanStripesGlasses, accessory: 'Glasses' },
  'Blue-Stripes': { src: blueStripesHats, accessory: 'Hats' },
  'Pink-Stripes': { src: magentaStripesGlasses, accessory: 'Glasses' },
})

/** Roster sprite URLs (history / random picks). */
export const ALL_DOOF_URLS = Object.freeze(
  Object.values(BOARD_ROSTER).map((cell) => cell.src),
)

/**
 * @param {string} color
 * @param {string} pattern
 * @returns {{ src: string, accessory: 'Hats' | 'Glasses' } | null}
 */
export function getDoofBoardCell(color, pattern) {
  return BOARD_ROSTER[`${color}-${pattern}`] ?? null
}

/**
 * @param {string} color
 * @param {string} pattern
 * @returns {string | null}
 */
export function getDoofImageUrl(color, pattern) {
  return getDoofBoardCell(color, pattern)?.src ?? null
}

/**
 * @param {number} count
 * @returns {string[]}
 */
export function pickRandomDoofUrls(count) {
  const pool = [...ALL_DOOF_URLS]
  const picks = []
  for (let i = 0; i < count; i += 1) {
    if (pool.length === 0) break
    const index = Math.floor(Math.random() * pool.length)
    picks.push(pool.splice(index, 1)[0])
  }
  while (picks.length < count && ALL_DOOF_URLS.length > 0) {
    picks.push(
      ALL_DOOF_URLS[Math.floor(Math.random() * ALL_DOOF_URLS.length)],
    )
  }
  return picks
}
