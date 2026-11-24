import { useEffect } from 'react'
import { attachGciBridge, detachGciBridge } from './gciBridge.js'

/**
 * Mount GCI operator ↔ game bridge once the Fireball session is ready.
 * @param {boolean} enabled
 */
export function useGciBridge(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined
    attachGciBridge()
    return () => {
      detachGciBridge()
    }
  }, [enabled])
}
