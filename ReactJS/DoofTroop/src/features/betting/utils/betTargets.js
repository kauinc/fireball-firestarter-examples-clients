import { DOOF_COLORS, DOOF_PATTERNS } from '../constants/doofs.js'

function clampIndex(value, max) {
  return Math.max(0, Math.min(max, value))
}

function cellKey(color, pattern) {
  return `${color}:${pattern}`
}

/** Build a stable placement key for stacking chips on the same target. */
export function betTargetKey(target) {
  switch (target.type) {
    case 'doof':
      return `doof:${target.color}:${target.pattern}`
    case 'split': {
      const cells = [...target.cells]
        .map((c) => cellKey(c.color, c.pattern))
        .sort()
      return `split:${target.coverage}:${cells.join('|')}`
    }
    case 'pattern':
      return `pattern:${target.pattern}`
    case 'color':
      return `color:${target.color}`
    case 'accessory':
      return `accessory:${target.accessory}`
    case 'combo':
      return 'combo:regular'
    case 'crazyCombo':
      return 'combo:crazy'
    default:
      return 'unknown'
  }
}

/**
 * Resolve roulette-style field target from normalized 0..1 coords
 * inside the PNG inner grid (doof-grid__playable), not the texture border.
 *
 * Priority: corner (4) → edge split (2) → single cell (1).
 * Four-way chips sit on the intersection of internal grid lines.
 */
export function resolveFieldTarget(nx, ny) {
  const cols = DOOF_COLORS.length
  const rows = DOOF_PATTERNS.length
  const gx = clampIndex(nx * cols, cols - 0.0001)
  const gy = clampIndex(ny * rows, rows - 0.0001)

  const vertLine = Math.round(gx)
  const horzLine = Math.round(gy)
  const validVert = vertLine >= 1 && vertLine <= cols - 1
  const validHorz = horzLine >= 1 && horzLine <= rows - 1

  // Prefer corners: larger hit box so the cross (+) wins over mid-edge 2-splits.
  const CORNER = 0.34
  const EDGE_HIT = 0.16

  // 4 Doofs — cursor near an internal cross (+)
  if (
    validVert &&
    validHorz &&
    Math.abs(gx - vertLine) <= CORNER &&
    Math.abs(gy - horzLine) <= CORNER
  ) {
    const c0 = vertLine - 1
    const c1 = vertLine
    const r0 = horzLine - 1
    const r1 = horzLine
    return {
      type: 'split',
      coverage: 4,
      cells: [
        { color: DOOF_COLORS[c0], pattern: DOOF_PATTERNS[r0] },
        { color: DOOF_COLORS[c1], pattern: DOOF_PATTERNS[r0] },
        { color: DOOF_COLORS[c0], pattern: DOOF_PATTERNS[r1] },
        { color: DOOF_COLORS[c1], pattern: DOOF_PATTERNS[r1] },
      ],
      anchor: { col: vertLine, row: horzLine, ox: 0, oy: 0 },
    }
  }

  // 2 Doofs — vertical line (same row, two colors)
  if (validVert && Math.abs(gx - vertLine) < EDGE_HIT) {
    const ri = Math.min(rows - 1, Math.floor(gy))
    const c0 = vertLine - 1
    const c1 = vertLine
    return {
      type: 'split',
      coverage: 2,
      cells: [
        { color: DOOF_COLORS[c0], pattern: DOOF_PATTERNS[ri] },
        { color: DOOF_COLORS[c1], pattern: DOOF_PATTERNS[ri] },
      ],
      anchor: { col: vertLine, row: ri, ox: 0, oy: 0.5 },
    }
  }

  // 2 Doofs — horizontal line (same color, two patterns)
  if (validHorz && Math.abs(gy - horzLine) < EDGE_HIT) {
    const ci = Math.min(cols - 1, Math.floor(gx))
    return {
      type: 'split',
      coverage: 2,
      cells: [
        { color: DOOF_COLORS[ci], pattern: DOOF_PATTERNS[horzLine - 1] },
        { color: DOOF_COLORS[ci], pattern: DOOF_PATTERNS[horzLine] },
      ],
      anchor: { col: ci, row: horzLine, ox: 0.5, oy: 0 },
    }
  }

  const ci = Math.min(cols - 1, Math.floor(gx))
  const ri = Math.min(rows - 1, Math.floor(gy))
  const color = DOOF_COLORS[ci]
  const pattern = DOOF_PATTERNS[ri]

  return {
    type: 'doof',
    coverage: 1,
    color,
    pattern,
    cells: [{ color, pattern }],
    anchor: { col: ci, row: ri, ox: 0.58, oy: 0.55 },
  }
}

export function patternTarget(pattern) {
  return {
    type: 'pattern',
    coverage: DOOF_COLORS.length,
    pattern,
    cells: DOOF_COLORS.map((color) => ({ color, pattern })),
  }
}

export function colorTarget(color) {
  return {
    type: 'color',
    coverage: DOOF_PATTERNS.length,
    color,
    cells: DOOF_PATTERNS.map((pattern) => ({ color, pattern })),
  }
}

export function accessoryTarget(accessory) {
  return {
    type: 'accessory',
    coverage: 9,
    accessory,
  }
}

/** Regular COMBO bar — one stack for 1st/2nd/3rd combo payout. */
export function comboTarget() {
  return {
    type: 'combo',
    coverage: 18,
  }
}

/** CRAZY COMBO bar — one stack when all three doofs are picked. */
export function crazyComboTarget() {
  return {
    type: 'crazyCombo',
    coverage: 18,
  }
}

/** CSS placement for a chip overlay inside the 6×3 field. */
export function fieldChipStyle(anchor) {
  const left = ((anchor.col + anchor.ox) / DOOF_COLORS.length) * 100
  const top = ((anchor.row + anchor.oy) / DOOF_PATTERNS.length) * 100
  return {
    left: `${left}%`,
    top: `${top}%`,
  }
}

/**
 * Resolve a chip drop from viewport coords, scoped to an optional HUD root.
 * Needed on touch: pointerup targets the chip that was pressed, not the
 * element under the finger — so field/label handlers never see the drop.
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {ParentNode | null} [root]
 */
export function resolveDropAtPoint(clientX, clientY, root = null) {
  const scope = root ?? document
  const playable =
    scope.querySelector?.('.doof-grid__playable') ??
    (scope instanceof Element && scope.matches?.('.doof-grid__playable')
      ? scope
      : null)

  if (playable) {
    const rect = playable.getBoundingClientRect()
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return resolveFieldTarget(
        (clientX - rect.left) / rect.width,
        (clientY - rect.top) / rect.height,
      )
    }
  }

  const hit = document.elementFromPoint(clientX, clientY)
  if (!hit) return null
  if (root instanceof Element && !root.contains(hit)) return null
  const node = hit.closest?.('[data-bet-drop]')
  if (!node) return null
  if (root instanceof Element && !root.contains(node)) return null
  try {
    return JSON.parse(node.getAttribute('data-bet-drop'))
  } catch {
    return null
  }
}
