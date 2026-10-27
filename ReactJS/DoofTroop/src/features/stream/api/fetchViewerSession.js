/** Dev-only: Vite proxies this to the dashboard (see vite.config.js). */
const DEV_TOKEN_URL = '/api/livekit-token'

/**
 * Absolute dashboard token endpoint for production / Fireball hosts.
 * Relative `/api/...` would hit cloud.fireballserver.com and 404.
 */
const PROD_TOKEN_URL =
  'https://dtdashboard-nine.vercel.app/api/livekit-token'

function resolveTokenUrl() {
  const fromEnv =
    typeof import.meta.env.VITE_LIVEKIT_TOKEN_URL === 'string'
      ? import.meta.env.VITE_LIVEKIT_TOKEN_URL.trim()
      : ''
  if (fromEnv) return fromEnv
  return import.meta.env.PROD ? PROD_TOKEN_URL : DEV_TOKEN_URL
}

/**
 * Fetches a LiveKit viewer session from the dt-dashboard token endpoint.
 * @param {{ tokenUrl?: string, signal?: AbortSignal }} [options]
 * @returns {Promise<{ url: string, token: string, room: string }>}
 */
export async function fetchViewerSession({
  tokenUrl = resolveTokenUrl(),
  signal,
} = {}) {
  if (!tokenUrl) {
    throw new Error(
      'LiveKit token URL is not configured (set VITE_LIVEKIT_TOKEN_URL)',
    )
  }

  // Never ship a relative token path to production hosts (Fireball CDN).
  if (import.meta.env.PROD && tokenUrl.startsWith('/')) {
    console.warn(
      `[livekit] Ignoring relative VITE_LIVEKIT_TOKEN_URL "${tokenUrl}" in production; using dashboard URL`,
    )
    tokenUrl = PROD_TOKEN_URL
  }

  const separator = tokenUrl.includes('?') ? '&' : '?'
  const url = `${tokenUrl}${separator}ts=${Date.now()}`
  const response = await fetch(url, { signal })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(
      body.error ||
        `Stream token unavailable (${response.status}). Check VITE_LIVEKIT_TOKEN_URL / proxy.`,
    )
  }

  const data = await response.json()

  if (typeof data.url !== 'string' || typeof data.token !== 'string') {
    throw new Error('Invalid LiveKit token response')
  }

  return {
    url: data.url,
    token: data.token,
    room: data.room ?? 'unknown',
  }
}
