import { useSyncExternalStore } from 'react'

const listeners = new Set()
let paused = false

function emit() {
  for (const listener of listeners) listener()
}

export function isGamePaused() {
  return paused
}

/**
 * @param {boolean} next
 */
export function setGamePaused(next) {
  const value = Boolean(next)
  if (value === paused) return
  paused = value
  emit()
}

export function subscribeGamePaused(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** @returns {boolean} */
export function useGamePaused() {
  return useSyncExternalStore(
    subscribeGamePaused,
    isGamePaused,
    () => false,
  )
}
