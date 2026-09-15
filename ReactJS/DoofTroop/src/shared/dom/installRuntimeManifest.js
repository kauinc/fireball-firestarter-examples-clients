/**
 * Ensure Add-to-Home-Screen opens the same entry that already works.
 *
 * Fireball hosts the game at .../index.html (see cloud.fireballserver.com/
 * games/.../index.html). Directory URLs like .../11/ return S3 NoSuchKey.
 *
 * iOS Safari ignores blob: manifests, so we keep the static
 * ./manifest.webmanifest (start_url: ./index.html) on iOS.
 * Other browsers get an absolute start_url (keeps query params).
 */
function isIosLike() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function resolveStartUrl() {
  const url = new URL(window.location.href)
  url.hash = ''
  const path = url.pathname
  if (!/\.html?$/i.test(path)) {
    url.pathname = path.endsWith('/') ? `${path}index.html` : `${path}/index.html`
  }
  return url
}

export function installRuntimeManifest() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  // iOS: leave the static HTTPS manifest (blob: start_url is ignored / breaks A2HS).
  if (isIosLike()) return

  const startUrl = resolveStartUrl()
  const scopeUrl = new URL('.', startUrl.href)

  const manifest = {
    name: 'Doof Troop',
    short_name: 'DoofTroop',
    description: 'Doof Troop live stream game',
    start_url: startUrl.href,
    scope: scopeUrl.href,
    id: startUrl.pathname + startUrl.search,
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: new URL('favicon.svg', scopeUrl).href,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }

  const blob = new Blob([JSON.stringify(manifest)], {
    type: 'application/manifest+json',
  })
  const objectUrl = URL.createObjectURL(blob)

  let link = document.querySelector('link[rel="manifest"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }
  link.href = objectUrl
}
