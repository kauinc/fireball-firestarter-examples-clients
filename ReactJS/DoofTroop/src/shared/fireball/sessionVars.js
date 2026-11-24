/**
 * Normalize Fireball auth / session server + client vars shapes.
 * Supports PascalCase, camelCase, snake_case, Extra wrappers, and client_side.
 *
 * Fireball Admin "Client side" variables land on auth.client_side
 * (same path Unity reads as sessionResponse.client_side / core_bet_values).
 */

/**
 * @param {unknown} auth
 * @returns {Record<string, unknown> | null}
 */
export function extractServerVars(auth) {
  if (!auth || typeof auth !== 'object') return null
  const a = /** @type {Record<string, unknown>} */ (auth)
  const extra = a.Extra ?? a.extra
  const fromExtra =
    extra && typeof extra === 'object'
      ? /** @type {Record<string, unknown>} */ (extra).server_vars ??
        /** @type {Record<string, unknown>} */ (extra).serverVars ??
        /** @type {Record<string, unknown>} */ (extra).ServerVariables
      : null
  const vars =
    a.ServerVariables ??
    a.serverVariables ??
    a.server_vars ??
    fromExtra ??
    null
  return vars && typeof vars === 'object'
    ? /** @type {Record<string, unknown>} */ (vars)
    : null
}

/**
 * Fireball session `client_side` payload (client-flagged game variables).
 * @param {unknown} auth
 * @returns {Record<string, unknown> | null}
 */
export function extractClientSide(auth) {
  if (!auth || typeof auth !== 'object') return null
  const a = /** @type {Record<string, unknown>} */ (auth)
  const side = a.client_side ?? a.clientSide ?? null
  return side && typeof side === 'object'
    ? /** @type {Record<string, unknown>} */ (side)
    : null
}

/**
 * @param {unknown} auth
 * @returns {Record<string, unknown> | null}
 */
export function extractClientVars(auth) {
  if (!auth || typeof auth !== 'object') return null
  const a = /** @type {Record<string, unknown>} */ (auth)
  const extra = a.Extra ?? a.extra
  const fromExtra =
    extra && typeof extra === 'object'
      ? /** @type {Record<string, unknown>} */ (extra).client_vars ??
        /** @type {Record<string, unknown>} */ (extra).clientVars ??
        /** @type {Record<string, unknown>} */ (extra).ClientVariables
      : null
  const vars =
    a.ClientVariables ??
    a.clientVariables ??
    a.client_vars ??
    fromExtra ??
    null
  return vars && typeof vars === 'object'
    ? /** @type {Record<string, unknown>} */ (vars)
    : null
}

/**
 * Merge server_vars + client_side for chip ladder / rates.
 * client_side wins on key conflicts (matches Unity client reads).
 * @param {unknown} auth
 * @returns {Record<string, unknown> | null}
 */
export function extractBetVars(auth) {
  const server = extractServerVars(auth)
  const clientSide = extractClientSide(auth)
  const clientVars = extractClientVars(auth)
  if (!server && !clientSide && !clientVars) return null
  return {
    ...(server ?? {}),
    ...(clientVars ?? {}),
    ...(clientSide ?? {}),
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} serverVars
 * @param {string} currency
 * @returns {number}
 */
export function currencyRateFromVars(serverVars, currency) {
  const rates =
    serverVars?.core_currency_rates ??
    serverVars?.coreCurrencyRates ??
    null
  if (!rates || typeof rates !== 'object') return 1
  const rate = Number(/** @type {Record<string, unknown>} */ (rates)[currency] ?? 1)
  return Number.isFinite(rate) && rate > 0 ? rate : 1
}

/**
 * @param {Record<string, unknown> | null | undefined} serverVars
 * @returns {number}
 */
export function coreBetDefaultFromVars(serverVars) {
  const raw = serverVars?.core_bet_default ?? serverVars?.coreBetDefault ?? 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Snap `value` to the nearest entry in `faces`.
 * @param {number[]} faces
 * @param {number} value
 * @returns {number}
 */
export function snapToNearestFace(faces, value) {
  if (!Array.isArray(faces) || faces.length === 0) return value
  let best = faces[0]
  let bestDist = Math.abs(best - value)
  for (let i = 1; i < faces.length; i++) {
    const dist = Math.abs(faces[i] - value)
    if (dist < bestDist) {
      best = faces[i]
      bestDist = dist
    }
  }
  return best
}
