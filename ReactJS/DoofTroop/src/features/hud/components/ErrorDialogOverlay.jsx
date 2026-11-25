import { useCallback, useRef } from 'react'
import {
  getDoofFireball,
  useCfGameState,
} from '../../../shared/fireball/index.js'
import { CfMessages } from '../../../shared/fireball/messages.js'
import { useT } from '../../../shared/i18n/index.js'
import { useDialogFocus } from '../hooks/useDialogFocus.js'
import './error-dialog.css'

function isPayReject(name) {
  const n = String(name ?? '').toLowerCase()
  return (
    n === CfMessages.WinningPayRejected || n === 'winning_pay_rejected'
  )
}

/**
 * Blocking RGS/CF error dialog — Reload / Home (non-closable, like slot ErrorDialog).
 */
export function ErrorDialogOverlay() {
  const t = useT()
  const { lastError } = useCfGameState()
  const open = Boolean(lastError?.blocking)
  const rootRef = useRef(null)

  useDialogFocus({
    open,
    containerRef: rootRef,
    // Escape must not dismiss — only Reload / Home.
  })

  const onReload = useCallback(() => {
    window.location.reload()
  }, [])

  const onHome = useCallback(() => {
    try {
      getDoofFireball().goHomePage()
    } catch {
      window.location.assign('/')
    }
  }, [])

  if (!open || !lastError) return null

  const title = isPayReject(lastError.name)
    ? t('label_pay_error')
    : t('label_action_error')
  const body =
    lastError.reason?.trim() ||
    t('label_something_went_wrong') ||
    t('label_unknown_error')

  return (
    <div
      ref={rootRef}
      className="error-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-dialog-title"
      aria-describedby="error-dialog-body"
      tabIndex={-1}
    >
      <div className="error-dialog__card">
        <h2 id="error-dialog-title" className="error-dialog__title">
          {title}
        </h2>
        <p id="error-dialog-body" className="error-dialog__body">
          {body}
        </p>
        <div className="error-dialog__actions">
          <button
            type="button"
            className="error-dialog__btn error-dialog__btn--primary"
            onClick={onReload}
          >
            {t('label_reload')}
          </button>
          <button
            type="button"
            className="error-dialog__btn error-dialog__btn--secondary"
            onClick={onHome}
          >
            {t('label_home')}
          </button>
        </div>
      </div>
    </div>
  )
}
