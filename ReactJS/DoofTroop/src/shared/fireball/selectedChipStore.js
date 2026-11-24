import { useSyncExternalStore } from 'react'
import {
  getChipValues,
  getDefaultChipValue,
  subscribeChipLadder,
} from '../../features/betting/state/chipLadderStore.js'
import { snapToNearestFace } from './sessionVars.js'

const listeners = new Set()
/** @type {number | null} */
let selected = null

function emit() {
  for (const listener of listeners) listener()
}

function resolveSelected() {
  if (selected != null) {
    const ladder = getChipValues()
    if (ladder.includes(selected)) return selected
  }
  return getDefaultChipValue()
}

export function getSelectedChip() {
  return resolveSelected()
}

/**
 * @param {number} value
 */
export function setSelectedChip(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return
  const face = snapToNearestFace([...getChipValues()], n)
  if (face === selected) return
  selected = face
  emit()
}

/**
 * Snap operator minor-unit bet to nearest HUD chip face.
 * @param {number} hudValue
 */
export function selectNearestChip(hudValue) {
  setSelectedChip(hudValue)
}

export function subscribeSelectedChip(listener) {
  listeners.add(listener)
  const unsubLadder = subscribeChipLadder(() => {
    // Drop stale face when ladder reloads after auth.
    if (selected != null && !getChipValues().includes(selected)) {
      selected = getDefaultChipValue()
    }
    listener()
  })
  return () => {
    listeners.delete(listener)
    unsubLadder()
  }
}

/** @returns {number} */
export function useSelectedChip() {
  return useSyncExternalStore(
    subscribeSelectedChip,
    getSelectedChip,
    getDefaultChipValue,
  )
}
