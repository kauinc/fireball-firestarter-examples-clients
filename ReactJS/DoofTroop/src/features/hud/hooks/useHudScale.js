import { useSyncExternalStore } from 'react'

/**
 * Shared HUD viewport metrics for betting, race, and settlement overlays.
 *
 * Landscape desktop (width ≥ breakpoint): fill ~stream width; soft height clamp.
 * Portrait sets orientation for LandscapeHudOnly rotate gate; scale uses the
 * landscape artboard (HUD itself never renders in portrait).
 * Narrow landscape width uses the compact landscape layout.
 */
export const HUD_DESIGN = Object.freeze({
  width: 1200,
  height: 640,
  /** Bottom HUD stack height at scale 1 (board + mid + footer). */
  desktopContentHeight: 400,
  desktopWidthFraction: 0.96,
  desktopMaxHeightFraction: 0.72,
  landscapeWidth: 900,
  landscapeHeight: 420,
  /** Below this width → phone layouts. Not tied to aspect ratio alone. */
  compactBreakpoint: 900,
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

function computeHudViewport() {
  const vv = window.visualViewport
  const width = Math.max(0, (vv?.width ?? window.innerWidth) - HUD_DESIGN.pad * 2)
  const height = Math.max(
    0,
    (vv?.height ?? window.innerHeight) - HUD_DESIGN.pad * 2,
  )

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

  const compact = width < HUD_DESIGN.compactBreakpoint

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
