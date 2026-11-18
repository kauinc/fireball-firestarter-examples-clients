import { emptyCrazyComboPicks } from '../../features/betting/constants/combo.js'
import { roundMoney } from '../../features/betting/utils/chipMath.js'

/**
 * @param {Record<string, unknown> | null | undefined} obj
 * @param {...string} keys
 */
export function field(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] != null) {
      return obj[key]
    }
  }
  for (const key of keys) {
    const lower = key.toLowerCase()
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase() === lower && v != null) return v
    }
  }
  return undefined
}

/**
 * @param {unknown} chip
 */
function normalizeChip(chip) {
  if (!chip || typeof chip !== 'object') return null
  const metal = String(field(chip, 'Metal', 'metal') ?? 'gold')
  const value = Number(field(chip, 'Value', 'value') ?? 0)
  const count = field(chip, 'Count', 'count')
  if (!(value > 0)) return null
  return {
    metal,
    value: roundMoney(value),
    ...(count != null ? { count: Number(count) } : null),
  }
}

/**
 * @param {unknown} target
 */
function normalizeTarget(target) {
  if (!target || typeof target !== 'object') return null
  const type = field(target, 'Type', 'type')
  if (!type) return null
  const next = { type: String(type) }
  const coverage = field(target, 'Coverage', 'coverage')
  if (coverage != null) next.coverage = Number(coverage)
  const color = field(target, 'Color', 'color')
  if (color != null) next.color = String(color)
  const pattern = field(target, 'Pattern', 'pattern')
  if (pattern != null) next.pattern = String(pattern)
  const accessory = field(target, 'Accessory', 'accessory')
  if (accessory != null) next.accessory = String(accessory)
  const cells = field(target, 'Cells', 'cells')
  if (Array.isArray(cells)) {
    next.cells = cells.map((cell) => ({
      color: String(field(cell, 'Color', 'color') ?? ''),
      pattern: String(field(cell, 'Pattern', 'pattern') ?? ''),
    }))
  }
  const anchor = field(target, 'Anchor', 'anchor')
  if (anchor != null) next.anchor = anchor
  return next
}

/**
 * @param {unknown} bet
 */
export function normalizeBet(bet) {
  if (!bet || typeof bet !== 'object') return null
  const id = String(field(bet, 'Id', 'id') ?? '')
  const key = String(field(bet, 'Key', 'key') ?? '')
  const chips = (field(bet, 'Chips', 'chips') ?? [])
    .map(normalizeChip)
    .filter(Boolean)
  const positions = (field(bet, 'Positions', 'positions') ?? []).map(String)
  const target = normalizeTarget(field(bet, 'Target', 'target'))
  if (!id || !key || !target) return null
  return { id, key, chips, positions, target }
}

/**
 * @param {unknown} picks
 */
export function normalizeCrazyComboPicks(picks) {
  const empty = emptyCrazyComboPicks()
  if (!picks || typeof picks !== 'object') return empty
  const next = { ...empty }
  for (const place of Object.keys(empty)) {
    const slot =
      field(picks, place) ??
      picks[place] ??
      null
    if (!slot || typeof slot !== 'object') {
      next[place] = null
      continue
    }
    const color = field(slot, 'Color', 'color')
    const pattern = field(slot, 'Pattern', 'pattern')
    next[place] =
      color && pattern
        ? { color: String(color), pattern: String(pattern) }
        : null
  }
  return next
}

/**
 * @param {unknown} pick
 */
export function normalizeComboPick(pick) {
  if (!pick || typeof pick !== 'object') return null
  const kind = field(pick, 'Kind', 'kind')
  const key = field(pick, 'Key', 'key')
  if (!kind || !key) return null
  return { kind: String(kind), key: String(key) }
}

/**
 * Map CF SettlementResult → overlay settlement shape.
 * @param {Record<string, unknown>} settlement
 * @param {import('../../features/settlement/utils/settlementFromRound.js').PodiumWinner[] | null} [fallbackWinners]
 */
export function normalizeSettlementResult(settlement, fallbackWinners = null) {
  if (!settlement || typeof settlement !== 'object') return null
  const byIdRaw = field(settlement, 'ById', 'byId') ?? {}
  /** @type {Record<string, { won: boolean, stake: number, payout: number }>} */
  const byId = {}
  for (const [id, outcome] of Object.entries(byIdRaw)) {
    if (!outcome || typeof outcome !== 'object') continue
    byId[id] = {
      won: Boolean(field(outcome, 'Won', 'won')),
      stake: roundMoney(Number(field(outcome, 'Stake', 'stake') ?? 0)),
      payout: roundMoney(Number(field(outcome, 'Payout', 'payout') ?? 0)),
    }
  }

  const winnersRaw = field(settlement, 'Winners', 'winners')
  let winners = fallbackWinners
  if (Array.isArray(winnersRaw) && winnersRaw.length > 0) {
    winners = winnersRaw.map((w, i) => {
      const place = String(field(w, 'Place', 'place') ?? ['1st', '2nd', '3rd'][i])
      const color = String(field(w, 'Color', 'color') ?? '')
      const pattern = String(field(w, 'Pattern', 'pattern') ?? '')
      const doofIndex = Number(field(w, 'DoofIndex', 'doofIndex') ?? -1)
      return {
        place,
        color,
        pattern,
        accessory: field(w, 'Accessory', 'accessory') ?? null,
        doofIndex,
        src: null,
        timeLabel: null,
      }
    })
  }

  const totalWin = roundMoney(
    Number(field(settlement, 'TotalWin', 'totalWin') ?? 0),
  )
  const winCount = Number(field(settlement, 'WinCount', 'winCount') ?? 0)
  const didWin = Boolean(field(settlement, 'DidWin', 'didWin') ?? totalWin > 0)

  return Object.freeze({
    didWin,
    totalWin,
    winCount,
    winners: winners ? Object.freeze(winners) : Object.freeze([]),
    outcomes: Object.freeze({
      didWin,
      totalWin,
      winCount,
      byId: Object.freeze(byId),
    }),
    roundId: field(settlement, 'RoundId', 'roundId') ?? null,
    officialPlacements: field(
      settlement,
      'OfficialPlacements',
      'officialPlacements',
    ),
    fromServer: true,
  })
}

/**
 * Serialize client bet target for CF PlaceChipRequest.
 * @param {Record<string, unknown>} target
 */
export function serializeTarget(target) {
  if (!target) return null
  return {
    Type: target.type,
    Coverage: target.coverage ?? undefined,
    Color: target.color ?? undefined,
    Pattern: target.pattern ?? undefined,
    Accessory: target.accessory ?? undefined,
    Cells: Array.isArray(target.cells)
      ? target.cells.map((c) => ({
          Color: c.color,
          Pattern: c.pattern,
        }))
      : undefined,
    Anchor: target.anchor ?? undefined,
  }
}

/**
 * @param {Record<string, unknown>} bet
 */
export function serializeBet(bet) {
  return {
    Id: bet.id,
    Key: bet.key,
    Chips: (bet.chips ?? []).map((c) => ({
      Metal: c.metal,
      Value: c.value,
      Count: c.count ?? 1,
    })),
    Positions: bet.positions ?? [],
    Target: serializeTarget(bet.target),
  }
}
