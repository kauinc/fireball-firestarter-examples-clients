import { useSyncExternalStore } from 'react'
import { VisibilityOption } from 'fireball-fireworks-sdk-client'

const listeners = new Set()
let open = false

function emit() {
  for (const listener of listeners) listener()
}

export function isHowToPlayOpen() {
  return open
}

/**
 * @param {boolean} next
 */
export function setHowToPlayOpen(next) {
  const value = Boolean(next)
  if (value === open) return
  open = value
  emit()
}

export function toggleHowToPlay() {
  setHowToPlayOpen(!open)
}

/**
 * Map GCI VisibilityOption → How to play overlay.
 * @param {number} option
 */
export function applyHowToPlayVisibility(option) {
  const opt = Number(option)
  if (opt === VisibilityOption.Show) setHowToPlayOpen(true)
  else if (opt === VisibilityOption.Hide) setHowToPlayOpen(false)
  else if (opt === VisibilityOption.Toggle) toggleHowToPlay()
  else setHowToPlayOpen(true)
}

export function subscribeHowToPlay(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** @returns {boolean} */
export function useHowToPlayOpen() {
  return useSyncExternalStore(
    subscribeHowToPlay,
    isHowToPlayOpen,
    () => false,
  )
}
