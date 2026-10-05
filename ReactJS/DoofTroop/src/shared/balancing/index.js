import balancing from './dooftroopBalancing.json'

export { balancing }

const STANDARD_KEYS = Object.freeze([
  'accessory',
  'pattern',
  'split4',
  'color',
  'split2',
  'doof',
])

/**
 * Tray metal → podium coverage (matches CHIP_METAL_LABELS).
 * gold = WINNER (1st), silver = TOP 2, bronze = TOP 3.
 * @param {string | null | undefined} metal
 * @returns {ReadonlyArray<'1st' | '2nd' | '3rd'>}
 */
export function positionsForMetal(metal) {
  if (metal === 'silver') return Object.freeze(['1st', '2nd'])
  if (metal === 'bronze') return Object.freeze(['1st', '2nd', '3rd'])
  return Object.freeze(['1st'])
}

/**
 * @param {string | null | undefined} metal
 * @returns {'first' | 'top2' | 'top3'}
 */
export function scopeForMetal(metal) {
  if (metal === 'silver') return 'top2'
  if (metal === 'bronze') return 'top3'
  return 'first'
}

/**
 * Map selected podium places → paytable scope.
 * @param {ReadonlyArray<string> | null | undefined} positions
 * @returns {'first' | 'top2' | 'top3'}
 */
export function positionScope(positions) {
  const count = Array.isArray(positions) ? positions.length : 0
  if (count <= 1) return 'first'
  if (count === 2) return 'top2'
  return 'top3'
}

/**
 * Resolve standard bet key used in balancing.standard.
 * @param {{ type?: string, coverage?: number } | null | undefined} target
 * @returns {string | null}
 */
export function standardBetKey(target) {
  if (!target?.type) return null
  if (target.type === 'split') {
    return target.coverage === 4 ? 'split4' : 'split2'
  }
  if (STANDARD_KEYS.includes(target.type)) return target.type
  return null
}

/**
 * Map a COMBO bar pick → special payout key.
 * @param {{ kind?: string, key?: string } | null | undefined} comboPick
 * @returns {keyof typeof balancing.special}
 */
export function specialKeyForComboPick(comboPick) {
  if (!comboPick?.kind || !comboPick?.key) return 'colorCombo'
  if (comboPick.kind === 'accessories') {
    if (comboPick.key === 'Hats') return 'hatsCombo'
    if (comboPick.key === 'Glasses') return 'glassesCombo'
  }
  if (comboPick.kind === 'patterns') {
    if (comboPick.key === 'Solid') return 'solidCombo'
    if (comboPick.key === 'Dots') return 'dotsCombo'
    if (comboPick.key === 'Stripes') return 'stripesCombo'
  }
  if (comboPick.kind === 'colors') return 'colorCombo'
  return 'colorCombo'
}

/**
 * RTP payout multiplier for a bet target.
 * @param {{ type?: string, coverage?: number } | null | undefined} target
 * @param {ReadonlyArray<string> | null | undefined} positions
 * @param {{
 *   comboPick?: { kind?: string, key?: string } | null,
 *   metal?: string | null,
 *   scope?: 'first' | 'top2' | 'top3' | null,
 * }} [meta]
 */
export function payoutMultiplier(target, positions, meta = {}) {
  if (!target?.type) return 1

  if (target.type === 'crazyCombo') {
    return balancing.special.crazyCombo
  }

  if (target.type === 'combo') {
    const key = specialKeyForComboPick(meta.comboPick)
    return balancing.special[key] ?? balancing.special.colorCombo
  }

  const betKey = standardBetKey(target)
  if (!betKey) return 1
  const scope =
    meta.scope ??
    (meta.metal ? scopeForMetal(meta.metal) : null) ??
    positionScope(positions)
  return balancing.standard[betKey]?.[scope] ?? 1
}

function collectPayouts() {
  /** @type {number[]} */
  const values = []
  for (const bet of Object.values(balancing.standard)) {
    for (const n of Object.values(bet)) {
      if (typeof n === 'number') values.push(n)
    }
  }
  for (const n of Object.values(balancing.special)) {
    if (typeof n === 'number') values.push(n)
  }
  return values
}

let cachedMin = null
let cachedMax = null

export function minPayout() {
  if (cachedMin == null) {
    cachedMin = Math.min(...collectPayouts())
  }
  return cachedMin
}

export function maxPayout() {
  if (cachedMax == null) {
    cachedMax = Math.max(...collectPayouts())
  }
  return cachedMax
}

/**
 * Min/max RTP multipliers among currently placed bets.
 * Each metal face uses its own scope (WINNER / TOP 2 / TOP 3).
 * Empty board → `{ min: 0, max: 0 }` (UI shows `x0` / `x0`).
 * @param {ReadonlyArray<{ target?: object, positions?: string[], chips?: Array<{ metal?: string, value?: number }> }> | null | undefined} bets
 * @param {{ comboPick?: { kind?: string, key?: string } | null }} [meta]
 * @returns {{ min: number, max: number }}
 */
export function payoutRangeForBets(bets, meta = {}) {
  /** @type {number[]} */
  const values = []
  for (const bet of bets ?? []) {
    const type = bet?.target?.type
    if (type === 'combo' || type === 'crazyCombo') {
      const n = payoutMultiplier(bet.target, bet.positions, meta)
      if (Number.isFinite(n)) values.push(n)
      continue
    }

    const chips = bet?.chips ?? []
    if (chips.length === 0) {
      const n = payoutMultiplier(bet?.target, bet?.positions, meta)
      if (Number.isFinite(n)) values.push(n)
      continue
    }

    for (const chip of chips) {
      if (!(chip?.value > 0)) continue
      const n = payoutMultiplier(bet.target, positionsForMetal(chip.metal), {
        ...meta,
        metal: chip.metal,
      })
      if (Number.isFinite(n)) values.push(n)
    }
  }
  if (values.length === 0) {
    return { min: 0, max: 0 }
  }
  return { min: Math.min(...values), max: Math.max(...values) }
}

/**
 * Display form for UI labels (`x1.1`, `x775.2`, `x4651.2`) — one decimal.
 * @param {number} n
 */
export function formatMultiplier(n) {
  if (!Number.isFinite(n)) return 'x1'
  const rounded = Math.round(n * 10) / 10
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
  return `x${text}`
}

export function colorComboMultiplier() {
  return balancing.special.colorCombo
}

export function crazyComboMultiplier() {
  return balancing.special.crazyCombo
}
