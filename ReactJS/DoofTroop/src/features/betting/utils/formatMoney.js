import {
  CurrencyHelper,
  GameMode,
} from 'fireball-fireworks-sdk-client'
import { getDoofFireball } from '../../../shared/fireball/client.js'
import { getGameMode, isCoinsMode } from '../../../shared/fireball/gameMode.js'

/**
 * Format a stake / balance for HUD meters (mode-aware).
 * HUD stores major units for fun/money (dollars) and integer coins for coins mode.
 * @param {number} value
 */
export function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'

  const session = safeSession()
  const mode = getGameMode()

  if (mode === GameMode.coins || isCoinsMode()) {
    return Math.round(n).toLocaleString(undefined, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })
  }

  // CurrencyHelper expects minor units (cents).
  const multiplier =
    session?.multiplier != null && Number(session.multiplier) > 0
      ? Number(session.multiplier)
      : 100
  const minor = Math.round(n * multiplier)

  if (session) {
    CurrencyHelper.setSession(session)
  }

  return CurrencyHelper.formatMoney(minor)
}

/**
 * Compact chip face label (tray / stack).
 * @param {number} value
 */
export function formatChipFace(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'

  if (isCoinsMode()) {
    return String(Math.round(n))
  }

  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) {
    return String(Math.round(n))
  }
  return String(n)
}

function safeSession() {
  try {
    return getDoofFireball()?.session ?? null
  } catch {
    return null
  }
}
