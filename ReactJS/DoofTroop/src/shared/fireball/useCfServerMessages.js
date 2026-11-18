import { useEffect } from 'react'
import { getDoofFireball } from './client.js'
import { applyServerMessage } from './applyServerMessage.js'

/**
 * Subscribe to Fireball serverMessage / push responses for CF game events.
 * @param {boolean} ready
 */
export function useCfServerMessages(ready) {
  useEffect(() => {
    if (!ready) return undefined
    const fireball = getDoofFireball()

    const onServer = (event) => {
      const detail = event?.detail
      const name = detail?.name ?? detail?.Name
      const message = detail?.getMessage?.() ?? detail?.message
      applyServerMessage(name, message)
    }

    const offServer = fireball.on('serverMessage', onServer)
    const offBroadcast = fireball.on('broadcastMessage', onServer)

    return () => {
      offServer?.()
      offBroadcast?.()
      fireball.off?.('serverMessage', onServer)
      fireball.off?.('broadcastMessage', onServer)
    }
  }, [ready])
}
