/** Doof Troop Fireball game id (FireStation / Fireball DB). */
export const DOOF_TROOP_GAME_ID = '013313dd-af6e-48b7-9322-83e5321c6c7b'

/**
 * Shared Fireball development operator (same as Fruits / HelloWorld samples).
 * Override with VITE_FIREBALL_OPERATOR_ID when launching under a real shell.
 */
export const DOOF_TROOP_DEV_OPERATOR_ID =
  '964d5c31-043c-413d-b28d-8d0c2c0b1504'

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

  const gameMode =
    (typeof env.VITE_FIREBALL_GAME_MODE === 'string' &&
      env.VITE_FIREBALL_GAME_MODE.trim()) ||
    'fun'

  const operatorId =
    (typeof env.VITE_FIREBALL_OPERATOR_ID === 'string' &&
      env.VITE_FIREBALL_OPERATOR_ID.trim()) ||
    DOOF_TROOP_DEV_OPERATOR_ID

  const currency =
    (typeof env.VITE_FIREBALL_CURRENCY === 'string' &&
      env.VITE_FIREBALL_CURRENCY.trim()) ||
    'USD'

  const useDemo =
    env.VITE_FIREBALL_DEMO === '1' || env.VITE_FIREBALL_DEMO === 'true'

  return {
    gameId,
    environment,
    gameMode,
    operatorId,
    currency,
    useDemo,
  }
}
