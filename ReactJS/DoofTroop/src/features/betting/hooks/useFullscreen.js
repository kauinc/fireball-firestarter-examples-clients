import { useCallback, useSyncExternalStore } from 'react'

const IMMERSIVE_CLASS = 'is-app-immersive'

function isIosLike() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  return Boolean(navigator.standalone)
}

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  )
}

function getFullscreenTarget() {
  return document.getElementById('root') || document.documentElement
}

function requestNativeFullscreen(node) {
  const attempts = []
  if (typeof node.requestFullscreen === 'function') {
    attempts.push(() => node.requestFullscreen({ navigationUI: 'hide' }))
    attempts.push(() => node.requestFullscreen())
  }
  if (typeof node.webkitRequestFullscreen === 'function') {
    attempts.push(() => node.webkitRequestFullscreen())
  }
  if (typeof node.webkitRequestFullScreen === 'function') {
    attempts.push(() => node.webkitRequestFullScreen())
  }
  if (typeof node.mozRequestFullScreen === 'function') {
    attempts.push(() => node.mozRequestFullScreen())
  }
  if (typeof node.msRequestFullscreen === 'function') {
    attempts.push(() => node.msRequestFullscreen())
  }

  if (attempts.length === 0) {
    return Promise.reject(new Error('Fullscreen API unavailable'))
  }

  let chain = Promise.reject(new Error('no attempt'))
  for (const attempt of attempts) {
    chain = chain.catch(() => {
      try {
        return Promise.resolve(attempt())
      } catch (err) {
        return Promise.reject(err)
      }
    })
  }
  return chain
}

function exitNativeFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen()
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen()
  if (document.webkitCancelFullScreen) return document.webkitCancelFullScreen()
  if (document.mozCancelFullScreen) return document.mozCancelFullScreen()
  if (document.msExitFullscreen) return document.msExitFullscreen()
  return Promise.resolve()
}

let immersiveActive = false
let homeScreenHint = false

/** @type {{ isFullscreen: boolean, needsHomeScreen: boolean }} */
let snapshot = Object.freeze({
  isFullscreen: false,
  needsHomeScreen: false,
})
const listeners = new Set()
let bound = false

function readIsFullscreen() {
  return Boolean(getFullscreenElement()) || immersiveActive || isStandaloneDisplay()
}

function emit() {
  const next = Object.freeze({
    isFullscreen: readIsFullscreen(),
    needsHomeScreen: homeScreenHint,
  })
  if (
    next.isFullscreen === snapshot.isFullscreen &&
    next.needsHomeScreen === snapshot.needsHomeScreen
  ) {
    return
  }
  snapshot = next
  for (const listener of listeners) listener()
}

function setImmersiveActive(active) {
  if (immersiveActive === active) return
  immersiveActive = active
  document.documentElement.classList.toggle(IMMERSIVE_CLASS, active)
  emit()
}

function setHomeScreenHint(active) {
  const next = Boolean(active)
  if (homeScreenHint === next) {
    emit()
    return
  }
  homeScreenHint = next
  emit()
}

function onFullscreenChange() {
  if (getFullscreenElement()) {
    setImmersiveActive(false)
    setHomeScreenHint(false)
  }
  emit()
}

function ensureBound() {
  if (bound || typeof document === 'undefined') return
  bound = true
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange)
  document.addEventListener('mozfullscreenchange', onFullscreenChange)
  document.addEventListener('MSFullscreenChange', onFullscreenChange)
  emit()
}

function releaseBound() {
  if (!bound || listeners.size > 0) return
  bound = false
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
  document.removeEventListener('mozfullscreenchange', onFullscreenChange)
  document.removeEventListener('MSFullscreenChange', onFullscreenChange)
}

function subscribe(listener) {
  listeners.add(listener)
  ensureBound()
  return () => {
    listeners.delete(listener)
    releaseBound()
  }
}

function getSnapshot() {
  return snapshot
}

const SERVER_SNAPSHOT = Object.freeze({
  isFullscreen: false,
  needsHomeScreen: false,
})

function enterIosFallback() {
  setImmersiveActive(true)
  setHomeScreenHint(isIosLike())
  try {
    window.scrollTo(0, 0)
  } catch {
    // ignore
  }
}

/**
 * Fullscreen toggle:
 * - Desktop / Android: native Fullscreen API (hides browser chrome)
 * - iPhone (Chrome/Safari): API missing — immersive fill + Home Screen hint
 */
export function useFullscreen() {
  const { isFullscreen, needsHomeScreen } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT,
  )

  const dismissHomeScreenHint = useCallback(() => {
    setHomeScreenHint(false)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (isStandaloneDisplay()) {
      setHomeScreenHint(false)
      emit()
      return
    }

    if (getFullscreenElement()) {
      void exitNativeFullscreen().catch((err) => {
        console.warn('[fullscreen]', err?.message || err)
      })
      setImmersiveActive(false)
      setHomeScreenHint(false)
      return
    }

    if (immersiveActive) {
      setImmersiveActive(false)
      setHomeScreenHint(false)
      return
    }

    const node = getFullscreenTarget()
    const nativeAvailable =
      typeof node.requestFullscreen === 'function' ||
      typeof node.webkitRequestFullscreen === 'function' ||
      typeof node.webkitRequestFullScreen === 'function' ||
      typeof node.mozRequestFullScreen === 'function' ||
      typeof node.msRequestFullscreen === 'function'

    // iPhone: methods are often missing — skip straight to fallback (keeps UX snappy).
    if (!nativeAvailable || (isIosLike() && document.fullscreenEnabled === false)) {
      enterIosFallback()
      return
    }

    void requestNativeFullscreen(node)
      .then(() => {
        if (getFullscreenElement()) {
          setImmersiveActive(false)
          setHomeScreenHint(false)
          return
        }
        // Resolved but not fullscreen (stub APIs on some WebKits).
        if (isIosLike()) enterIosFallback()
      })
      .catch((err) => {
        console.warn('[fullscreen]', err?.message || err)
        enterIosFallback()
      })
  }, [])

  return {
    isFullscreen,
    needsHomeScreen,
    toggleFullscreen,
    dismissHomeScreenHint,
  }
}
