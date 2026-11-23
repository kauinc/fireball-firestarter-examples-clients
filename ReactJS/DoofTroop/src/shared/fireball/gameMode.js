import { GameMode } from 'fireball-fireworks-sdk-client'
import { readFireballEnv } from './config.js'

/** @type {'fun' | 'coins' | 'money' | null} */
let activeMode = null

/**
 * @param {string | null | undefined} mode
 * @returns {'fun' | 'coins' | 'money'}
 */
export function normalizeGameMode(mode) {
  const raw = String(mode ?? '').toLowerCase().trim()
  if (raw === GameMode.coins || raw === 'coins') return GameMode.coins
  if (raw === GameMode.money || raw === 'money') return GameMode.money
  return GameMode.fun
}

/**
 * Persist mode after Fireball init (session is source of truth).
 * @param {string | null | undefined} mode
 */
export function setActiveGameMode(mode) {
  activeMode = normalizeGameMode(mode)
}

/**
 * Active mode from last init, else Vite env default.
 * @returns {'fun' | 'coins' | 'money'}
 */
export function getGameMode() {
  if (activeMode) return activeMode
  return normalizeGameMode(readFireballEnv().gameMode)
}

export function isFunMode() {
  return getGameMode() === GameMode.fun
}

export function isCoinsMode() {
  return getGameMode() === GameMode.coins
}

export function isMoneyMode() {
  return getGameMode() === GameMode.money
}

/** Coins + money use CF PlaceBet / PayWin; fun is local wallet only. */
export function usesCfWallet() {
  return !isFunMode()
}

export { GameMode }
