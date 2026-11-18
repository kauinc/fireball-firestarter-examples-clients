import { CfMessages } from './messages.js'
import {
  applyBetsLocked,
  applyBetsUpdated,
  applyCfError,
  applyRefundResult,
  applySettleResult,
} from './cfGameStore.js'
import { field } from './normalize.js'
import { isErrorPayload } from 'fireball-fireworks-sdk-client'

/**
 * @param {string | null | undefined} name
 * @param {Record<string, unknown> | null | undefined} message
 */
export function applyServerMessage(name, message) {
  if (!message || typeof message !== 'object') return

  const msgName = String(name ?? field(message, 'Name', 'name') ?? '')

  if (isErrorPayload(message) || msgName === CfMessages.BetsRejected) {
    applyCfError({ ...message, Name: msgName || CfMessages.BetsRejected })
    return
  }

  switch (msgName) {
    case CfMessages.BetsUpdated:
      applyBetsUpdated(message)
      break
    case CfMessages.BetsLocked:
      applyBetsLocked(message)
      break
    case CfMessages.SettleResult:
      applySettleResult(message)
      break
    case CfMessages.RefundResult:
      applyRefundResult(message)
      break
    default:
      break
  }
}

/**
 * Apply a sendRequest response or thrown ErrorResponse.
 * @param {unknown} result
 */
export function applySendResult(result) {
  if (!result || typeof result !== 'object') return
  const name = field(result, 'Name', 'name')
  applyServerMessage(name != null ? String(name) : null, /** @type {Record<string, unknown>} */ (result))
}
