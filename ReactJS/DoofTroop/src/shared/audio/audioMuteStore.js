import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'dooftroop.audioMuted'
const ROOT_KEY = '__doofTroopAudioMute'

/**
 * Keep mute state on globalThis so lazy-loaded stream chunks share the
 * same singleton as the HUD (Vite can otherwise duplicate the module).
 */
function getRoot() {
  const root = globalThis
  if (!root[ROOT_KEY]) {
    root[ROOT_KEY] = {
      muted: readStoredMuted(),
      listeners: new Set(),
    }
  }
  return root[ROOT_KEY]
}

function readStoredMuted() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function persist(next) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function emit() {
  for (const listener of getRoot().listeners) listener()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('dooftroop:audio-mute', {
        detail: { muted: getRoot().muted },
      }),
    )
  }
}

export function isAudioMuted() {
  return getRoot().muted
}

export function setAudioMuted(next) {
  const root = getRoot()
  const value = Boolean(next)
  if (value === root.muted) return
  root.muted = value
  persist(root.muted)
  emit()
}

export function toggleAudioMuted() {
  setAudioMuted(!getRoot().muted)
  return getRoot().muted
}

export function subscribeAudioMuted(listener) {
  const root = getRoot()
  root.listeners.add(listener)

  function onCustom(event) {
    if (event?.detail && typeof event.detail.muted === 'boolean') {
      root.muted = event.detail.muted
    }
    listener()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('dooftroop:audio-mute', onCustom)
  }

  return () => {
    root.listeners.delete(listener)
    if (typeof window !== 'undefined') {
      window.removeEventListener('dooftroop:audio-mute', onCustom)
    }
  }
}

export function getAudioMutedSnapshot() {
  return getRoot().muted
}

/** @returns {boolean} */
export function useAudioMuted() {
  return useSyncExternalStore(
    subscribeAudioMuted,
    getAudioMutedSnapshot,
    () => false,
  )
}
