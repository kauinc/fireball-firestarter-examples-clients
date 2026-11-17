import {
  FireballClient,
  AuthRequest,
  createRequest,
  setFireballLogLevel,
  LogLevels,
} from 'fireball-fireworks-sdk-client'
import { readFireballEnv } from './config.js'

/** @type {FireballClient | null} */
let client = null

export function getDoofFireball() {
  if (!client) {
    client = new FireballClient()
  }
  return client
}

/**
 * Fireball wallet amounts are cents (long). HUD uses decimal money.
 * @param {unknown} balance
 * @returns {number}
 */
export function balanceFromRgs(balance) {
  const n = Number(balance)
  if (!Number.isFinite(n)) return 0
  return Math.round(n) / 100
}

/**
 * Init + authorize (Fruits/Ares-style development). Demo only when
 * VITE_FIREBALL_DEMO=true. Prefer launch URL params when the operator shell
 * provides them; otherwise use Vite env / defaults.
 *
 * @returns {Promise<{
 *   fireball: FireballClient,
 *   auth: import('fireball-fireworks-sdk-client').AuthResponse | null,
 *   demo: boolean,
 * }>}
 */
export async function connectFireball() {
  const fireball = getDoofFireball()
  const env = readFireballEnv()

  setFireballLogLevel(LogLevels.Information)

  const hasLaunchQuery =
    typeof window !== 'undefined' &&
    /[?&](gameId|gameid|token|operatorId|operatorid)=/i.test(
      window.location.search || '',
    )

  if (hasLaunchQuery) {
    await fireball.init()
  } else {
    const operatorPlayerId = crypto.randomUUID()
    const token = crypto.randomUUID()
    await fireball.init({
      gameId: env.gameId,
      environment: env.environment,
      gameMode: env.gameMode,
      operatorId: env.operatorId,
      operatorPlayerId,
      token,
      currency: env.currency,
      language: 'en',
      country: 'US',
    })
  }

  let auth = null
  let demo = false

  if (env.useDemo) {
    auth = await fireball.demoAuthorize({
      currency: env.currency,
      balance: 500000,
    })
    demo = true
  } else {
    auth = await fireball.authorize(new AuthRequest(fireball.session))
  }

  try {
    fireball.gci.sendLoadingComplete()
    fireball.gci.sendReadyToPlay()
  } catch {
    // GCI is best-effort outside operator shell
  }

  return { fireball, auth, demo }
}

/**
 * Send a game message through the RGS router (same role as Unity SendRequest).
 * @param {string} name
 * @param {Record<string, unknown>} [fields]
 */
export async function sendGameRequest(name, fields = {}) {
  const fireball = getDoofFireball()
  if (!fireball.isAuth) {
    throw new Error('Fireball is not authorized')
  }
  const request = createRequest(name, fireball.session, null, fields)
  return fireball.sendRequest(request)
}
