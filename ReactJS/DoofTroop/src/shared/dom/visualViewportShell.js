/**
 * Pin #root to the visual viewport ONLY when browser chrome actually shrinks
 * the visible box vs the layout viewport.
 *
 * Chrome DevTools device mode: vv ≈ layout → no-op (keeps the good desktop look).
 * Real iPhone Safari/Chrome: vv shorter → pin so scale matches what the user sees.
 */
export function installVisualViewportShell(
  root = typeof document !== 'undefined' ? document.getElementById('root') : null,
) {
  if (!root || typeof window === 'undefined') return () => {}

  let pinned = false

  function clearPin() {
    if (!pinned) return
    pinned = false
    root.style.position = ''
    root.style.margin = ''
    root.style.top = ''
    root.style.left = ''
    root.style.right = ''
    root.style.bottom = ''
    root.style.width = ''
    root.style.height = ''
  }

  function sync() {
    const vv = window.visualViewport
    const layoutH =
      window.innerHeight || document.documentElement.clientHeight || 0

    // No meaningful chrome gap → leave CSS 100svh/#root alone (DevTools path).
    if (!vv || vv.height >= layoutH - 24) {
      clearPin()
      return
    }

    pinned = true
    root.style.position = 'fixed'
    root.style.margin = '0'
    root.style.right = 'auto'
    root.style.bottom = 'auto'
    root.style.top = `${vv.offsetTop}px`
    root.style.left = `${vv.offsetLeft}px`
    root.style.width = `${vv.width}px`
    root.style.height = `${vv.height}px`
  }

  sync()
  window.addEventListener('resize', sync)
  window.addEventListener('orientationchange', sync)
  const vv = window.visualViewport
  vv?.addEventListener('resize', sync)
  vv?.addEventListener('scroll', sync)

  return () => {
    window.removeEventListener('resize', sync)
    window.removeEventListener('orientationchange', sync)
    vv?.removeEventListener('resize', sync)
    vv?.removeEventListener('scroll', sync)
    clearPin()
  }
}
