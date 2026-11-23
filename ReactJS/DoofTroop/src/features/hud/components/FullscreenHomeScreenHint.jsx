import { useFullscreen } from '../../betting/hooks/useFullscreen.js'
import { useT } from '../../../shared/i18n/index.js'
import './fullscreen-hint.css'

/**
 * iPhone cannot hide browser chrome via Fullscreen API.
 * Guide the player to Add to Home Screen (true fullscreen / standalone).
 */
export function FullscreenHomeScreenHint() {
  const t = useT()
  const { needsHomeScreen, dismissHomeScreenHint } = useFullscreen()
  if (!needsHomeScreen) return null

  return (
    <div
      className="fullscreen-hint"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-hint-title"
    >
      <div className="fullscreen-hint__card">
        <p id="fullscreen-hint-title" className="fullscreen-hint__title">
          {t('label_fullscreen_iphone_title')}
        </p>
        <p className="fullscreen-hint__body">
          {t('label_fullscreen_iphone_body')}
        </p>
        <button
          type="button"
          className="fullscreen-hint__btn"
          onClick={dismissHomeScreenHint}
        >
          {t('label_got_it')}
        </button>
      </div>
    </div>
  )
}
