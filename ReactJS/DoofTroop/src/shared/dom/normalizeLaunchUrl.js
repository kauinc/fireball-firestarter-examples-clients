/**
 * Keep the address bar on …/index.html so iOS Add to Home Screen bookmarks a
 * real S3 object key. Directory URLs (…/11/) return NoSuchKey on Fireball CDN.
 */
export function normalizeLaunchUrl() {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  if (/\.html?$/i.test(url.pathname)) return

  const next = `${url.pathname.replace(/\/?$/, '/')}index.html`
  if (next === url.pathname) return

  url.pathname = next
  window.history.replaceState(window.history.state, '', url.href)
}
