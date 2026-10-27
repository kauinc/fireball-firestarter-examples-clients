import { useCallback, useEffect, useState } from 'react'
import { fetchViewerSession } from '../api/fetchViewerSession.js'

/**
 * Loads a LiveKit viewer session once on mount (and on `reload`).
 */
export function useViewerSession() {
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState({
    status: 'loading',
    session: null,
    error: null,
  })

  const reload = useCallback(() => {
    setResult({ status: 'loading', session: null, error: null })
    setReloadKey((key) => key + 1)
  }, [])

  useEffect(() => {
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
  }, [reloadKey])

  return {
    session: result.session,
    error: result.error,
    isLoading: result.status === 'loading',
    reload,
  }
}
