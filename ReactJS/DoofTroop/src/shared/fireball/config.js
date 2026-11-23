import { GameMode } from 'fireball-fireworks-sdk-client'

/** Doof Troop Fireball game id (FireStation / Fireball DB). */
export const DOOF_TROOP_GAME_ID = '013313dd-af6e-48b7-9322-83e5321c6c7b'

/**
 * Shared Fireball development operator (same as Fruits / HelloWorld samples).
 * Override with VITE_FIREBALL_OPERATOR_ID when launching under a real shell.
 */
export const DOOF_TROOP_DEV_OPERATOR_ID =
  '964d5c31-043c-413d-b28d-8d0c2c0b1504'

/** Fun local wallet start: $5,000 play money (minor units / cents). */
export const FUN_START_BALANCE_CENTS = 500000

/**
 * @param {ImportMetaEnv | Record<string, string | undefined>} [env]
 */
export function readFireballEnv(env = import.meta.env) {
  const gameId =
    (typeof env.VITE_FIREBALL_GAME_ID === 'string' &&
      env.VITE_FIREBALL_GAME_ID.trim()) ||
    DOOF_TROOP_GAME_ID

  const environment =
    (typeof env.VITE_FIREBALL_ENVIRONMENT === 'string' &&
      env.VITE_FIREBALL_ENVIRONMENT.trim()) ||
    'development'

  const gameModeRaw =
    (typeof env.VITE_FIREBALL_GAME_MODE === 'string' &&
      env.VITE_FIREBALL_GAME_MODE.trim()) ||
    'fun'
  const gameMode = String(gameModeRaw).toLowerCase()

  const operatorId =
    (typeof env.VITE_FIREBALL_OPERATOR_ID === 'string' &&
      env.VITE_FIREBALL_OPERATOR_ID.trim()) ||
    DOOF_TROOP_DEV_OPERATOR_ID

  const currencyDefault =
    gameMode === GameMode.coins || gameMode === 'coins' ? 'COINS' : 'USD'

  const currency =
    (typeof env.VITE_FIREBALL_CURRENCY === 'string' &&
      env.VITE_FIREBALL_CURRENCY.trim()) ||
    currencyDefault

  const language =
    (typeof env.VITE_FIREBALL_LANGUAGE === 'string' &&
      env.VITE_FIREBALL_LANGUAGE.trim()) ||
    'en'

  // Translation CMS app UUID (Bonbonella-style). Falls back to gameId only if
  // Admin created the Translation App with the same id — usually it is different.
  const translationAppId =
    (typeof env.VITE_FIREBALL_TRANSLATION_APP_ID === 'string' &&
      env.VITE_FIREBALL_TRANSLATION_APP_ID.trim()) ||
    ''

  const useDemo =
    env.VITE_FIREBALL_DEMO === '1' || env.VITE_FIREBALL_DEMO === 'true'

  return {
    gameId,
    environment,
    gameMode,
    operatorId,
    currency,
    language,
    translationAppId,
    useDemo,
  }
}
