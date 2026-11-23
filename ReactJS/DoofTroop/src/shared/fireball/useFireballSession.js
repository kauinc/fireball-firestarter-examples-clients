import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '../i18n/i18nStore.js'
import { connectFireball, getDoofFireball } from './client.js'

/**
 * Boot Fireball once per page load (init + authorize).
 * Retries only when the caller invokes `reload`.
 *
 * @returns {{
 *   ready: boolean,
 *   error: string | null,
 *   isLoading: boolean,
 *   demo: boolean,
 *   auth: import('fireball-fireworks-sdk-client').AuthResponse | null,
 *   fireball: import('fireball-fireworks-sdk-client').FireballClient,
 *   reload: () => Promise<void>,
 * }}
 */
export function useFireballSession() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [auth, setAuth] = useState(null)
  const bootIdRef = useRef(0)

  const run = useCallback(async () => {
    const bootId = ++bootIdRef.current
    setIsLoading(true)
    setError(null)
    setReady(false)
    setAuth(null)

    try {
      const result = await connectFireball()
      if (bootId !== bootIdRef.current) return

      setAuth(result.auth)
      setDemo(result.demo)
      setReady(true)
    } catch (err) {
      if (bootId !== bootIdRef.current) return
      const message =
        err?.Reason ||
        err?.reason ||
        err?.message ||
        (typeof err === 'string' ? err : t('label_fireball_connection_failed'))
      setError(String(message))
      setReady(false)
    } finally {
      if (bootId === bootIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    run()
  }, [run])

  return {
    ready,
    error,
    isLoading,
    demo,
    auth,
    fireball: getDoofFireball(),
    reload: run,
  }
}
