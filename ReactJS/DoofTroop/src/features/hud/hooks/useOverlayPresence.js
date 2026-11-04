import { useEffect, useState } from 'react'

/** Default fade-out duration — keep in sync with `.is-exiting` CSS. */
export const OVERLAY_EXIT_MS = 280

/**
 * Keep an overlay mounted through a short exit fade after `active` goes false.
 *
 * @param {boolean} active
 * @param {number} [exitMs]
 * @returns {{ mounted: boolean, exiting: boolean }}
 */
export function useOverlayPresence(active, exitMs = OVERLAY_EXIT_MS) {
  const [mounted, setMounted] = useState(Boolean(active))
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (active) {
      setMounted(true)
      setExiting(false)
      return undefined
    }
    if (!mounted) return undefined

    setExiting(true)
    const timerId = window.setTimeout(() => {
      setMounted(false)
      setExiting(false)
    }, exitMs)

    return () => window.clearTimeout(timerId)
  }, [active, exitMs, mounted])

  return { mounted, exiting }
}
