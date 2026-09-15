import { CHIP_STACK_ORDER } from '../constants/doofs.js'

function chipAmount(chip) {
  return chip.value * (chip.count ?? 1)
}

function stackTotal(chips) {
  return chips.reduce((sum, chip) => sum + chipAmount(chip), 0)
}

function roundMoney(value) {
  return Math.round(value * 100) / 100
}

/**
 * One face per metal (max 3). Same metal merges into a single chip amount.
 * Stack order bottom → top: bronze → silver → gold.
 */
export function mergeMetalChips(chips) {
  const totals = Object.create(null)
  for (const chip of chips ?? []) {
    if (!chip?.metal || !(chipAmount(chip) > 0)) continue
    totals[chip.metal] = roundMoney((totals[chip.metal] ?? 0) + chipAmount(chip))
  }

  return CHIP_STACK_ORDER.filter((metal) => totals[metal] > 0).map((metal) => ({
    metal,
    value: totals[metal],
  }))
}

/**
 * Combo / Crazy Combo bars ignore Winner / Top 2 / Top 3 —
 * every placement adds to one stake face.
 */
export function mergeComboChips(chips) {
  const total = roundMoney(stackTotal(chips))
  return total > 0 ? [{ metal: 'gold', value: total }] : []
}

export function isComboBarTarget(target) {
  return target?.type === 'combo' || target?.type === 'crazyCombo'
}

export function getBetTotal(bet) {
  return roundMoney(stackTotal(bet?.chips ?? []))
}

export { stackTotal, roundMoney }
