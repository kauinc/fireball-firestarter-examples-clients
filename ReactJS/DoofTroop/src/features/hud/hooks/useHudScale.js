import { useSyncExternalStore } from 'react'

/**
 * Shared HUD viewport metrics for betting, race, and settlement overlays.
 *
 * DevTools / desktop (tall enough landscape): same as git — desktop layout when
 * width ≥ 900, scale from layout size.
 *
 * Real iPhone Safari: browser chrome shortens the visible box. We then:
 * - read #root / visualViewport (after optional pin)
 * - switch to compact when short, so Hats/Combo don't stack into the board
 * DevTools keeps vv ≈ layout, so it stays on the desktop path.
 */
export const HUD_DESIGN = Object.freeze({
  width: 1200,
  height: 640,
  desktopContentHeight: 400,
  desktopWidthFraction: 0.96,
  desktopMaxHeightFraction: 0.72,
  landscapeWidth: 900,
  landscapeHeight: 420,
  compactBreakpoint: 900,
  /**
   * Below this height use compact packing. DevTools Pro Max landscape is ~440
   * → stays desktop. Real Safari with chrome is often ≤380 → compact.
   */
  compactMaxHeight: 400,
  minScale: 0.35,
  pad: 8,
})

const SERVER_VIEWPORT = Object.freeze({
  scale: 1,
  compact: false,
  orientation: 'landscape',
})

/** @type {{ scale: number, compact: boolean, orientation: 'portrait' | 'landscape' }} */
let snapshot = SERVER_VIEWPORT
const listeners = new Set()
let windowBound = false
let refreshScheduled = false

function roundScale(value) {
  return Math.round(value * 1000) / 1000
}

function fitLandscapeScale(width, height) {
  return Math.min(
    width / HUD_DESIGN.landscapeWidth,
    height / HUD_DESIGN.landscapeHeight,
  )
}

function readViewportSize() {
  const root = document.getElementById('root')
  if (root) {
    const { width, height } = root.getBoundingClientRect()
    if (width > 1 && height > 1) return { width, height }
  }

  const layoutW =
    window.innerWidth || document.documentElement.clientWidth || 1
  const layoutH =
    window.innerHeight || document.documentElement.clientHeight || 1
  const vv = window.visualViewport

  // Prefer the smaller visible box when chrome eats height (real iPhone).
  // DevTools: vv ≈ layout → unchanged.
  if (vv && vv.height > 1 && vv.width > 1) {
    return {
      width: Math.max(1, Math.min(layoutW, vv.width)),
      height: Math.max(1, Math.min(layoutH, vv.height)),
    }
  }

  return { width: Math.max(1, layoutW), height: Math.max(1, layoutH) }
}

function computeHudViewport() {
  const size = readViewportSize()
  const width = Math.max(0, size.width - HUD_DESIGN.pad * 2)
  const height = Math.max(0, size.height - HUD_DESIGN.pad * 2)

  if (width <= 0 || height <= 0) {
    return {
      scale: HUD_DESIGN.minScale,
      compact: true,
      orientation: 'portrait',
    }
  }

  const aspectPortrait = height > width
  const orientation = aspectPortrait ? 'portrait' : 'landscape'

  if (aspectPortrait) {
    const fitted = fitLandscapeScale(width, height)
    return {
      scale: roundScale(Math.max(fitted, HUD_DESIGN.minScale)),
      compact: true,
      orientation: 'portrait',
    }
  }

  // Short visible height (real phone chrome) → compact. DevTools ~440 stays desktop.
  const compact =
    width < HUD_DESIGN.compactBreakpoint ||
    height < HUD_DESIGN.compactMaxHeight

  let fitted
  if (!compact) {
    const byWidth =
      (width * HUD_DESIGN.desktopWidthFraction) / HUD_DESIGN.width
    const byMaxHeight =
      (height * HUD_DESIGN.desktopMaxHeightFraction) /
      HUD_DESIGN.desktopContentHeight
    fitted = Math.min(byWidth, byMaxHeight)
  } else {
    fitted = fitLandscapeScale(width, height)
  }

  const scale = roundScale(Math.max(fitted, HUD_DESIGN.minScale))

  return { scale, compact, orientation }
}

function applyViewportRefresh() {
  refreshScheduled = false
  const next = computeHudViewport()
  if (
    next.scale === snapshot.scale &&
    next.compact === snapshot.compact &&
    next.orientation === snapshot.orientation
  ) {
    return
  }
  snapshot = Object.freeze(next)
  for (const listener of listeners) listener()
}

function refreshViewport() {
  if (refreshScheduled) return
  refreshScheduled = true
  requestAnimationFrame(() => {
    requestAnimationFrame(applyViewportRefresh)
  })
}

function ensureWindowBound() {
  if (windowBound || typeof window === 'undefined') return
  windowBound = true
  window.addEventListener('resize', refreshViewport)
  window.addEventListener('orientationchange', refreshViewport)
  const vv = window.visualViewport
  vv?.addEventListener('resize', refreshViewport)
  vv?.addEventListener('scroll', refreshViewport)
  refreshViewport()
}

function releaseWindowBound() {
  if (!windowBound || listeners.size > 0) return
  windowBound = false
  window.removeEventListener('resize', refreshViewport)
  window.removeEventListener('orientationchange', refreshViewport)
  const vv = window.visualViewport
  vv?.removeEventListener('resize', refreshViewport)
  vv?.removeEventListener('scroll', refreshViewport)
}

function subscribe(listener) {
  listeners.add(listener)
  ensureWindowBound()
  return () => {
    listeners.delete(listener)
    releaseWindowBound()
  }
}

function getSnapshot() {
  return snapshot
}

function getServerSnapshot() {
  return SERVER_VIEWPORT
}

export function useHudViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
