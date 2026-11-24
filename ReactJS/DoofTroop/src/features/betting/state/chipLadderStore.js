import { useSyncExternalStore } from 'react'
import { GameMode } from 'fireball-fireworks-sdk-client'
import {
  CHIP_VALUES as MONEY_CHIP_VALUES,
  DEFAULT_CHIP_VALUE as MONEY_DEFAULT_CHIP,
  MAX_BET_PER_TARGET as MONEY_MAX_BET,
} from '../constants/doofs.js'
import { getGameMode, isCoinsMode } from '../../../shared/fireball/gameMode.js'
import {
  coreBetDefaultFromVars,
  currencyRateFromVars,
  extractBetVars,
  snapToNearestFace,
} from '../../../shared/fireball/sessionVars.js'

/** Default coins ladder when server vars are empty. */
export const DEFAULT_COIN_CHIPS = Object.freeze([1, 2, 5, 10, 20, 50, 100])

/** Max stake per target in coin units (mirrors server Constants.MaxBetPerTargetCoins). */
export const MAX_BET_PER_TARGET_COINS = 10000

const listeners = new Set()

let chipValues = [...MONEY_CHIP_VALUES]
let defaultChipValue = MONEY_DEFAULT_CHIP
/** Max stake per target in HUD units. */
let maxBetPerTarget = MONEY_MAX_BET

function emit() {
  for (const listener of listeners) listener()
}

function commit(nextChips, nextDefault, nextMax) {
  chipValues = Object.freeze([...nextChips])
  defaultChipValue = nextDefault
  maxBetPerTarget = nextMax
  emit()
}

export function getChipValues() {
  return chipValues
}

export function getDefaultChipValue() {
  return defaultChipValue
}

export function getMaxBetPerTarget() {
  return maxBetPerTarget
}

export function subscribeChipLadder(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useChipLadder() {
  return useSyncExternalStore(
    subscribeChipLadder,
    () => chipValues,
    () => chipValues,
  )
}

export function useDefaultChipValue() {
  return useSyncExternalStore(
    subscribeChipLadder,
    () => defaultChipValue,
    () => defaultChipValue,
  )
}

/**
 * Largest chip denomination that does not exceed `maxAmount` (or null).
 * @param {number} maxAmount
 */
export function largestChipAtMost(maxAmount) {
  if (!(maxAmount > 0)) return null
  let best = null
  for (const value of chipValues) {
    if (value <= maxAmount) best = value
    else break
  }
  return best
}

/**
 * Apply ladder from session / auth (server vars) or mode defaults.
 * @param {import('fireball-fireworks-sdk-client').FireballSession | null | undefined} session
 * @param {import('fireball-fireworks-sdk-client').AuthResponse | null | undefined} auth
 */
export function applyChipLadderFromSession(session, auth = null) {
  const mode = getGameMode() || session?.gameMode || GameMode.fun
  // Fireball puts Client-side Admin vars on auth.client_side (Ares path).
  const vars = extractBetVars(auth)

  if (mode === GameMode.coins || isCoinsMode()) {
    const fromAuth = extractCoinBets(vars)
    const chips = fromAuth?.length > 0 ? fromAuth : [...DEFAULT_COIN_CHIPS]
    const betDefault = coreBetDefaultFromVars(vars)
    const selected =
      betDefault > 0 ? snapToNearestFace(chips, betDefault) : (chips[0] ?? 1)
    commit(chips, selected, MAX_BET_PER_TARGET_COINS)
    return
  }

  const currency = session?.currency || 'USD'
  const rate = currencyRateFromVars(vars, currency)
  const moneyFromAuth = extractMoneyBets(vars, rate)
  // No core_bet_values → scale built-in ladder by rate (UAH:50 → 0.2 becomes 10).
  const chips =
    moneyFromAuth?.length > 0
      ? moneyFromAuth
      : MONEY_CHIP_VALUES.map((v) => Math.round(v * rate * 100) / 100)
  const max = Math.round(MONEY_MAX_BET * rate * 100) / 100
  const betDefaultMinor = coreBetDefaultFromVars(vars)
  let selected = chips[0] ?? MONEY_DEFAULT_CHIP
  if (betDefaultMinor > 0) {
    const face = Math.round((betDefaultMinor * rate) / 100 * 100) / 100
    selected = snapToNearestFace(chips, face)
  }
  commit(chips, selected, max)
}

/**
 * @param {Record<string, unknown> | null} vars
 * @returns {number[] | null}
 */
function extractCoinBets(vars) {
  if (!vars) return null
  const list = vars.coin_bets ?? vars.coinBets
  if (!Array.isArray(list) || list.length === 0) return null
  return list.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0)
}

/**
 * @param {Record<string, unknown> | null} vars
 * @param {number} rate
 * @returns {number[] | null}
 */
function extractMoneyBets(vars, rate) {
  if (!vars) return null
  const bets = vars.core_bet_values ?? vars.coreBetValues
  if (!Array.isArray(bets) || bets.length === 0) return null
  // core_bet_values are minor units → HUD major.
  return bets
    .map((v) => Math.round((Number(v) * rate) / 100 * 100) / 100)
    .filter((n) => Number.isFinite(n) && n > 0)
}
