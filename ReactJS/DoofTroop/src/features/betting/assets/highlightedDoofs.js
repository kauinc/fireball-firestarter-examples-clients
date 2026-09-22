/**
 * Highlighted doof sprites for drag-target preview (glow behind matching cells).
 */
import redDotsHats from '../../../assets/highlightedDoofs/DoofHighlighted_0005s_0003_Red_Dots_Hats.png'
import yellowDotsGlasses from '../../../assets/highlightedDoofs/DoofHighlighted_0004s_0004_Yellow_Dots_Glasses.png'
import greenDotsHats from '../../../assets/highlightedDoofs/DoofHighlighted_0003s_0003_Green_Dots_Hats.png'
import cyanDotsGlasses from '../../../assets/highlightedDoofs/DoofHighlighted_0002s_0004_Cyan_Dots_Glasses.png'
import blueDotsHats from '../../../assets/highlightedDoofs/DoofHighlighted_0001s_0003_Blue_Dots_Hats.png'
import magentaDotsGlasses from '../../../assets/highlightedDoofs/DoofHighlighted_0000s_0004_Magenta_Dots_Glasses.png'
import redSolidGlasses from '../../../assets/highlightedDoofs/DoofHighlighted_0005s_0006_Red_Solid_Glasses.png'
import yellowSolidHats from '../../../assets/highlightedDoofs/DoofHighlighted_0004s_0006_Yellow_Solid_Hats.png'
import greenSolidGlasses from '../../../assets/highlightedDoofs/DoofHighlighted_0003s_0007_Green_Solid_Glasses.png'
import cyanSolidHats from '../../../assets/highlightedDoofs/DoofHighlighted_0002s_0006_Cyan_Solid_Hats.png'
import blueSolidGlasses from '../../../assets/highlightedDoofs/DoofHighlighted_0001s_0007_Blue_Solid_Glasses.png'
import magentaSolidHats from '../../../assets/highlightedDoofs/DoofHighlighted_0000s_0006_Magenta_Solid_Hats.png'
import redStripesHats from '../../../assets/highlightedDoofs/DoofHighlighted_0005s_0000_Red_Stripes_Hats.png'
import yellowStripesGlasses from '../../../assets/highlightedDoofs/DoofHighlighted_0004s_0001_Yellow_Stripes_Glasses.png'
import greenStripesHats from '../../../assets/highlightedDoofs/DoofHighlighted_0003s_0000_Green_Stripes_Hats.png'
import cyanStripesGlasses from '../../../assets/highlightedDoofs/DoofHighlighted_0002s_0001_Cyan_Stripes_Glasses.png'
import blueStripesHats from '../../../assets/highlightedDoofs/DoofHighlighted_0001s_0000_Blue_Srtipes_Hats.png'
import magentaStripesGlasses from '../../../assets/highlightedDoofs/DoofHighlighted_0000s_0001_Magenta_Stripes_Glasses.png'
import { getDoofBoardCell } from './doofImages.js'

const HIGHLIGHT_ROSTER = Object.freeze({
  'Red-Dots': redDotsHats,
  'Yellow-Dots': yellowDotsGlasses,
  'Green-Dots': greenDotsHats,
  'Cyan-Dots': cyanDotsGlasses,
  'Blue-Dots': blueDotsHats,
  'Pink-Dots': magentaDotsGlasses,
  'Red-Solid': redSolidGlasses,
  'Yellow-Solid': yellowSolidHats,
  'Green-Solid': greenSolidGlasses,
  'Cyan-Solid': cyanSolidHats,
  'Blue-Solid': blueSolidGlasses,
  'Pink-Solid': magentaSolidHats,
  'Red-Stripes': redStripesHats,
  'Yellow-Stripes': yellowStripesGlasses,
  'Green-Stripes': greenStripesHats,
  'Cyan-Stripes': cyanStripesGlasses,
  'Blue-Stripes': blueStripesHats,
  'Pink-Stripes': magentaStripesGlasses,
})

/**
 * @param {string} color
 * @param {string} pattern
 * @returns {string | null}
 */
export function getHighlightedDoofUrl(color, pattern) {
  return HIGHLIGHT_ROSTER[`${color}-${pattern}`] ?? null
}

/**
 * Cells that should glow for a drag/drop target preview.
 * @param {Record<string, unknown> | null | undefined} target
 * @returns {{ color: string, pattern: string }[]}
 */
export function highlightCellsForTarget(target) {
  if (!target) return []

  if (Array.isArray(target.cells) && target.cells.length > 0) {
    return target.cells
  }

  if (target.type === 'doof' && target.color && target.pattern) {
    return [{ color: target.color, pattern: target.pattern }]
  }

  if (target.type === 'accessory' && target.accessory) {
    const cells = []
    for (const key of Object.keys(HIGHLIGHT_ROSTER)) {
      const [color, pattern] = key.split('-')
      const cell = getDoofBoardCell(color, pattern)
      if (cell?.accessory === target.accessory) {
        cells.push({ color, pattern })
      }
    }
    return cells
  }

  return []
}

/**
 * @param {Record<string, unknown> | null | undefined} target
 * @param {string} color
 * @param {string} pattern
 */
export function isCellHighlightedByTarget(target, color, pattern) {
  return highlightCellsForTarget(target).some(
    (cell) => cell.color === color && cell.pattern === pattern,
  )
}
