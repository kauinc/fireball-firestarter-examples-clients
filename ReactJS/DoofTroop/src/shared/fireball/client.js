import {
  FireballClient,
  AuthRequest,
  AuthResponse,
  CurrencyHelper,
  createRequest,
  setFireballLogLevel,
  LogLevels,
  GameMode,
} from 'fireball-fireworks-sdk-client'
import { loadTranslations } from '../i18n/loadTranslations.js'
import { readFireballEnv, FUN_START_BALANCE_CENTS } from './config.js'
import { isCoinsMode, setActiveGameMode, usesCfWallet } from './gameMode.js'
import { applyChipLadderFromSession } from '../../features/betting/state/chipLadderStore.js'
import { setBalance } from '../../features/betting/state/balanceStore.js'

/** @type {FireballClient | null} */
let client = null

export function getDoofFireball() {
  if (!client) {
    client = new FireballClient()
  }
  return client
}

/**
 * Fireball wallet amounts → HUD units.
 * money/fun: cents → major (/100). coins: 1:1 integer units.
 * @param {unknown} balance
 * @returns {number}
 */
export function balanceFromRgs(balance) {
  const n = Number(balance)
  if (!Number.isFinite(n)) return 0
  if (isCoinsMode()) return Math.round(n)
  return Math.round(n) / 100
}

/**
 * HUD units → RGS long (inverse of balanceFromRgs).
 * @param {number} hudAmount
 * @returns {number}
 */
export function balanceToRgs(hudAmount) {
  const n = Number(hudAmount)
  if (!Number.isFinite(n)) return 0
  if (isCoinsMode()) return Math.round(n)
  return Math.round(n * 100)
}

/**
 * Init + authorize. Fun mode = local wallet (no RGS auth).
 * Coins/money = CF authorize. VITE_FIREBALL_DEMO only overrides coins/money auth.
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
    const gameMode = env.gameMode
    const currency =
      gameMode === GameMode.coins
        ? env.currency === 'USD'
          ? 'COINS'
          : env.currency
        : env.currency
    await fireball.init({
      gameId: env.gameId,
      environment: env.environment,
      gameMode,
      operatorId: env.operatorId,
      operatorPlayerId,
      token,
      currency,
      language: env.language || 'en',
      country: 'US',
    })
  }

  setActiveGameMode(fireball.session?.gameMode ?? env.gameMode)
  CurrencyHelper.setSession(fireball.session)

  // EN first paint; remote pack merges when CMS responds (non-blocking for auth).
  const translationsPromise = loadTranslations({
    fireball,
    gameId: env.translationAppId || fireball.session?.gameId || env.gameId,
    language: fireball.session?.language || env.language || 'en',
  })

  let auth = null
  let demo = false

  if (!usesCfWallet()) {
    // Fun: local play-money wallet — no CF PlaceBet / PayWin path.
    const balance = FUN_START_BALANCE_CENTS
    auth = new AuthResponse({
      Balance: balance,
      Currency: fireball.session?.currency || env.currency || 'USD',
      GameMode: GameMode.fun,
      Environment: fireball.session?.environment,
      GameId: fireball.session?.gameId,
      PlayerId: fireball.session?.playerId || 'fun-player',
      GameSession: fireball.session?.gameSession || 'fun-session',
      OperatorId: fireball.session?.operatorId,
      OperatorPlayerId: fireball.session?.operatorPlayerId,
      Multiplier: 100,
    })
    if (fireball.session) {
      fireball.session.gameMode = GameMode.fun
      fireball.session.multiplier = 100
      fireball.session.gameSession = auth.GameSession
      fireball.session.playerId = auth.PlayerId
    }
    CurrencyHelper.setSession(fireball.session)
    setBalance(balanceFromRgs(balance))
    demo = true
  } else if (env.useDemo) {
    auth = await fireball.demoAuthorize({
      currency:
        fireball.session?.gameMode === GameMode.coins
          ? 'COINS'
          : env.currency,
      balance:
        fireball.session?.gameMode === GameMode.coins ? 5000 : 500000,
    })
    // demoAuthorize forces fun on session — restore coins/money for CF path testing.
    if (fireball.session) {
      fireball.session.gameMode = getSessionMode(fireball, env)
      setActiveGameMode(fireball.session.gameMode)
      if (fireball.session.gameMode === GameMode.coins) {
        fireball.session.currency = 'COINS'
      }
      CurrencyHelper.setSession(fireball.session)
    }
    demo = true
  } else {
    auth = await fireball.authorize(new AuthRequest(fireball.session))
    setActiveGameMode(fireball.session?.gameMode ?? env.gameMode)
  }

  applyChipLadderFromSession(fireball.session, auth)

  await translationsPromise.catch(() => {})

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
  if (!usesCfWallet()) {
    throw new Error('CF game requests are disabled in fun mode')
  }
  if (!fireball.isAuth) {
    throw new Error('Fireball is not authorized')
  }
  const request = createRequest(name, fireball.session, null, fields)
  return fireball.sendRequest(request)
}

/**
 * @param {FireballClient} fireball
 * @param {ReturnType<typeof readFireballEnv>} env
 */
function getSessionMode(fireball, env) {
  const fromEnv = env.gameMode
  // Prefer launch/env over demoAuthorize's forced fun.
  if (fromEnv === GameMode.coins || fromEnv === GameMode.money) return fromEnv
  return fireball.session?.gameMode || fromEnv || GameMode.fun
}
