import { useRef } from 'react'
import {
  setHowToPlayOpen,
  useHowToPlayOpen,
} from '../../../shared/fireball/howToPlayStore.js'
import { useT } from '../../../shared/i18n/index.js'
import { useDialogFocus } from '../hooks/useDialogFocus.js'
import './how-to-play.css'

/**
 * Minimal How to play / help overlay (menu + GCI help/paytable).
 */
export function HowToPlayOverlay() {
  const t = useT()
  const open = useHowToPlayOpen()
  const rootRef = useRef(null)

  useDialogFocus({
    open,
    onClose: () => setHowToPlayOpen(false),
    containerRef: rootRef,
  })

  if (!open) return null

  return (
    <div
      ref={rootRef}
      className="how-to-play"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
    >
      <div className="how-to-play__card">
        <h2 id="how-to-play-title" className="how-to-play__title">
          {t('label_how_to_play')}
        </h2>
        <ol className="how-to-play__list">
          <li>{t('label_howto_place_bets')}</li>
          <li>{t('label_howto_metals')}</li>
          <li>{t('label_howto_combo')}</li>
        </ol>
        <button
          type="button"
          className="how-to-play__btn"
          onClick={() => setHowToPlayOpen(false)}
        >
          {t('label_close')}
        </button>
      </div>
    </div>
  )
}
