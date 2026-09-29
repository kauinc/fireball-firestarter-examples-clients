import { getDoofBoardCell } from '../../betting/assets/doofImages.js'
import { POSITION_OPTIONS } from '../../betting/constants/doofs.js'
import { isCrazyComboComplete } from '../../betting/constants/combo.js'
import { positionsForMetal } from '../../../shared/balancing/index.js'
import { getBetTotal, roundMoney, isComboBarTarget } from '../../betting/utils/chipMath.js'
import { payoutMultiplier } from '../../../shared/balancing/index.js'

/**
 * Whether a single bet hits any podium winner for its selected positions.
 * @param {object} bet
 * @param {ReadonlyArray<{ place: string, color: string, pattern: string }>} winners
 * @param {{
 *   comboPick?: { kind: string, key: string } | null,
 *   crazyComboPicks?: Record<string, { color: string, pattern: string } | null>,
 * }} [meta]
 */
export function doesBetWin(bet, winners, meta = {}) {
  const target = bet?.target
  if (!target || !winners?.length) return false

  if (target.type === 'combo') {
    return doesComboWin(meta.comboPick, winners)
  }

  if (target.type === 'crazyCombo') {
    return doesCrazyComboWin(meta.crazyComboPicks, winners)
  }

  const places =
    Array.isArray(bet.positions) && bet.positions.length > 0
      ? bet.positions
      : ['1st', '2nd', '3rd']

  const relevant = winners.filter((w) => places.includes(w.place))
  if (relevant.length === 0) return false

  switch (target.type) {
    case 'doof':
      return relevant.some(
        (w) => w.color === target.color && w.pattern === target.pattern,
      )
    case 'split':
      return relevant.some((w) =>
        (target.cells ?? []).some(
          (cell) => cell.color === w.color && cell.pattern === w.pattern,
        ),
      )
    case 'color':
      return relevant.some((w) => w.color === target.color)
    case 'pattern':
      return relevant.some((w) => w.pattern === target.pattern)
    case 'accessory':
      return relevant.some((w) => {
        const cell = getDoofBoardCell(w.color, w.pattern)
        return cell?.accessory === target.accessory
      })
    default:
      return false
  }
}

/**
 * Regular COMBO: all three podium places match the pick (color / pattern / accessory).
 * @param {{ kind: string, key: string } | null | undefined} comboPick
 * @param {ReadonlyArray<{ place: string, color: string, pattern: string }>} winners
 */
function doesComboWin(comboPick, winners) {
  if (!comboPick?.kind || !comboPick?.key) return false
  if (winners.length < POSITION_OPTIONS.length) return false

  const podium = POSITION_OPTIONS.map((place) =>
    winners.find((w) => w.place === place),
  )
  if (podium.some((w) => !w)) return false

  if (comboPick.kind === 'colors') {
    return podium.every((w) => w.color === comboPick.key)
  }

  if (comboPick.kind === 'patterns') {
    return podium.every((w) => w.pattern === comboPick.key)
  }

  if (comboPick.kind === 'accessories') {
    return podium.every((w) => {
      const cell = getDoofBoardCell(w.color, w.pattern)
      return cell?.accessory === comboPick.key
    })
  }

  return false
}

/**
 * CRAZY COMBO: each slot pick must match that place on the podium.
 * @param {Record<string, { color: string, pattern: string } | null> | null | undefined} picks
 * @param {ReadonlyArray<{ place: string, color: string, pattern: string }>} winners
 */
function doesCrazyComboWin(picks, winners) {
  if (!isCrazyComboComplete(picks)) return false

  return POSITION_OPTIONS.every((place) => {
    const pick = picks[place]
    const winner = winners.find((w) => w.place === place)
    if (!pick || !winner) return false
    return pick.color === winner.color && pick.pattern === winner.pattern
  })
}

/**
 * Resolve each bet to win/lose + stake/payout against podium winners.
 * Standard bets pay per metal face (WINNER / TOP 2 / TOP 3 → different RTP).
 * @param {ReadonlyArray<object>} bets
 * @param {ReadonlyArray<{ place: string, color: string, pattern: string }>} winners
 * @param {{
 *   comboPick?: { kind: string, key: string } | null,
 *   crazyComboPicks?: Record<string, { color: string, pattern: string } | null>,
 * }} [meta]
 */
export function resolveBetOutcomes(bets, winners, meta = {}) {
  /** @type {Record<string, { won: boolean, stake: number, payout: number }>} */
  const byId = {}
  let totalWin = 0
  let winCount = 0

  for (const bet of bets ?? []) {
    const stake = getBetTotal(bet)
    let payout = 0
    let won = false

    if (isComboBarTarget(bet.target)) {
      won = doesBetWin(bet, winners, meta)
      const multiplier = payoutMultiplier(bet.target, bet.positions, meta)
      payout = won ? roundMoney(stake * multiplier) : 0
    } else {
      for (const chip of bet.chips ?? []) {
        const faceStake = roundMoney(chip.value * (chip.count ?? 1))
        if (!(faceStake > 0)) continue
        const positions = [...positionsForMetal(chip.metal)]
        const faceWon = doesBetWin({ ...bet, positions }, winners, meta)
        if (!faceWon) continue
        won = true
        const multiplier = payoutMultiplier(bet.target, positions, {
          ...meta,
          metal: chip.metal,
        })
        payout = roundMoney(payout + faceStake * multiplier)
      }
    }

    byId[bet.id] = { won, stake, payout }
    if (won) {
      winCount += 1
      totalWin += payout
    }
  }

  return Object.freeze({
    byId: Object.freeze(byId),
    didWin: winCount > 0,
    totalWin: roundMoney(totalWin),
    winCount,
  })
}
