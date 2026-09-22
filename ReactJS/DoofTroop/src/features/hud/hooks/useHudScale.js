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
 *
 * Portrait: video strip on top; HUD scale fits the board pane below it.
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
  /**
   * Portrait video strip: full-width ~16:9 (fig 2 ~30% of phone height).
   * Prefer at least 30% so the race reads large; clamp so the board fits.
   */
  portraitVideoAspect: 16 / 9,
  portraitVideoMaxFraction: 0.34,
  portraitVideoMinFraction: 0.26,
  portraitVideoPreferFraction: 0.28,
  /** Design width of the portrait betting board column. */
  portraitDesignWidth: 390,
  /** Design height of board + combo rails + footer in the lower pane. */
  portraitBoardDesignHeight: 520,
  /** Narrow portrait viewports get the mobile video zoom. */
  mobilePortraitMaxWidth: 900,
})

const SERVER_VIEWPORT = Object.freeze({
  scale: 1,
  compact: false,
  orientation: 'landscape',
  mobilePortrait: false,
  portraitVideoFraction: 0.28,
  portraitVideoPx: 0,
})

/**
 * @type {{
 *   scale: number,
 *   compact: boolean,
 *   orientation: 'portrait' | 'landscape',
 *   mobilePortrait: boolean,
 *   portraitVideoFraction: number,
 *   portraitVideoPx: number,
 * }}
 */
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

function fitPortraitScale(boardWidth, boardHeight) {
  return Math.min(
    boardWidth / HUD_DESIGN.portraitDesignWidth,
    boardHeight / HUD_DESIGN.portraitBoardDesignHeight,
  )
}

/** Full-width ~16:9 strip height, clamped for board space (fig 2). */
function portraitVideoMetrics(size) {
  const byAspect = size.width / HUD_DESIGN.portraitVideoAspect
  const preferred = size.height * HUD_DESIGN.portraitVideoPreferFraction
  const maxH = size.height * HUD_DESIGN.portraitVideoMaxFraction
  const minH = size.height * HUD_DESIGN.portraitVideoMinFraction
  const target = Math.max(byAspect, preferred)
  const videoPx = Math.round(Math.min(maxH, Math.max(minH, target)))
  return {
    portraitVideoPx: videoPx,
    portraitVideoFraction: videoPx / Math.max(1, size.height),
  }
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
      mobilePortrait: true,
      portraitVideoFraction: HUD_DESIGN.portraitVideoMinFraction,
      portraitVideoPx: 0,
    }
  }

  const aspectPortrait = height > width
  const orientation = aspectPortrait ? 'portrait' : 'landscape'
  const mobilePortrait =
    orientation === 'portrait' && width < HUD_DESIGN.mobilePortraitMaxWidth

  if (aspectPortrait) {
    const video = portraitVideoMetrics(size)
    const boardH = Math.max(
      1,
      size.height - video.portraitVideoPx - HUD_DESIGN.pad * 2,
    )
    const fitted = fitPortraitScale(width, boardH)
    return {
      scale: roundScale(Math.max(fitted, HUD_DESIGN.minScale)),
      compact: true,
      orientation: 'portrait',
      mobilePortrait,
      portraitVideoFraction: video.portraitVideoFraction,
      portraitVideoPx: video.portraitVideoPx,
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

  return {
    scale,
    compact,
    orientation,
    mobilePortrait: false,
    portraitVideoFraction: HUD_DESIGN.portraitVideoMinFraction,
    portraitVideoPx: 0,
  }
}

function applyViewportRefresh() {
  refreshScheduled = false
  const next = computeHudViewport()
  if (
    next.scale === snapshot.scale &&
    next.compact === snapshot.compact &&
    next.orientation === snapshot.orientation &&
    next.mobilePortrait === snapshot.mobilePortrait &&
    next.portraitVideoFraction === snapshot.portraitVideoFraction &&
    next.portraitVideoPx === snapshot.portraitVideoPx
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
