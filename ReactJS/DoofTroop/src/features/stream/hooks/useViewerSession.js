import { useCallback, useEffect, useState } from 'react'
import { fetchViewerSession } from '../api/fetchViewerSession.js'

/**
 * Loads a LiveKit viewer session once on mount (and on `reload`).
 * @param {{ enabled?: boolean }} [options] — skip token fetch in admin replay mode.
 */
export function useViewerSession({ enabled = true } = {}) {
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState({
    status: 'loading',
    session: null,
    error: null,
  })

  const reload = useCallback(() => {
    if (!enabled) return
    setResult({ status: 'loading', session: null, error: null })
    setReloadKey((key) => key + 1)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined

    const controller = new AbortController()
    const key = reloadKey

    fetchViewerSession({ signal: controller.signal })
      .then((session) => {
        if (controller.signal.aborted) return
        setResult({ status: 'ready', session, error: null })
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        // Ignore AbortError from a superseded reload.
        if (err?.name === 'AbortError') return
        const message = err?.message || String(err)
        console.error('[livekit] viewer session failed', message)
        setResult({
          status: 'error',
          session: null,
          error: message,
        })
      })

    return () => {
      // Key captured so Strict Mode remounts of the same reload still abort.
      void key
      controller.abort()
    }
  }, [reloadKey, enabled])

  if (!enabled) {
    return {
      session: null,
      error: null,
      isLoading: false,
      reload,
    }
  }

  return {
    session: result.session,
    error: result.error,
    isLoading: result.status === 'loading',
    reload,
  }
}
