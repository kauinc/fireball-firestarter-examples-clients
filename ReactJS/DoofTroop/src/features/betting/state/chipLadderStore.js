import { useSyncExternalStore } from 'react'
import { GameMode } from 'fireball-fireworks-sdk-client'
import {
  CHIP_VALUES as MONEY_CHIP_VALUES,
  DEFAULT_CHIP_VALUE as MONEY_DEFAULT_CHIP,
} from '../constants/doofs.js'
import { getGameMode, isCoinsMode } from '../../../shared/fireball/gameMode.js'

/** Default coins ladder when server vars are empty. */
export const DEFAULT_COIN_CHIPS = Object.freeze([1, 2, 5, 10, 20, 50, 100])

const listeners = new Set()

let chipValues = [...MONEY_CHIP_VALUES]
let defaultChipValue = MONEY_DEFAULT_CHIP
/** Max stake per target in HUD units. */
let maxBetPerTarget = 100

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

  if (mode === GameMode.coins || isCoinsMode()) {
    const fromAuth = extractCoinBets(auth)
    const chips =
      fromAuth?.length > 0 ? fromAuth : [...DEFAULT_COIN_CHIPS]
    commit(chips, chips[0] ?? 1, 10000)
    return
  }

  const moneyFromAuth = extractMoneyBets(auth, session)
  if (moneyFromAuth?.length > 0) {
    commit(moneyFromAuth, moneyFromAuth[0], 100)
    return
  }

  // Fun + money fallback: existing money-look ladder.
  commit([...MONEY_CHIP_VALUES], MONEY_DEFAULT_CHIP, 100)
}

/**
 * @param {unknown} auth
 * @returns {number[] | null}
 */
function extractCoinBets(auth) {
  if (!auth || typeof auth !== 'object') return null
  const vars =
    auth.ServerVariables ??
    auth.serverVariables ??
    auth.server_vars ??
    auth.Extra?.server_vars ??
    auth.extra?.server_vars
  const list = vars?.coin_bets ?? vars?.coinBets
  if (!Array.isArray(list) || list.length === 0) return null
  return list.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0)
}

/**
 * @param {unknown} auth
 * @param {import('fireball-fireworks-sdk-client').FireballSession | null | undefined} session
 * @returns {number[] | null}
 */
function extractMoneyBets(auth, session) {
  if (!auth || typeof auth !== 'object') return null
  const vars =
    auth.ServerVariables ??
    auth.serverVariables ??
    auth.server_vars ??
    auth.Extra?.server_vars ??
    auth.extra?.server_vars
  const bets = vars?.core_bet_values ?? vars?.coreBetValues
  if (!Array.isArray(bets) || bets.length === 0) return null

  const rates = vars?.core_currency_rates ?? vars?.coreCurrencyRates ?? {}
  const currency = session?.currency || 'USD'
  const rate = Number(rates?.[currency] ?? 1) || 1
  // core_bet_values are minor units → HUD major.
  return bets
    .map((v) => Math.round((Number(v) * rate) / 100 * 100) / 100)
    .filter((n) => Number.isFinite(n) && n > 0)
}
