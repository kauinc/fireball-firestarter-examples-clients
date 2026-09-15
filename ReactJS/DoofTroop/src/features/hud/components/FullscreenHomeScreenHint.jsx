import { useFullscreen } from '../../betting/hooks/useFullscreen.js'
import './fullscreen-hint.css'

/**
 * iPhone cannot hide browser chrome via Fullscreen API.
 * Guide the player to Add to Home Screen (true fullscreen / standalone).
 */
export function FullscreenHomeScreenHint() {
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
          Full screen on iPhone
        </p>
        <p className="fullscreen-hint__body">
          On iPhone, full screen only works from the Home Screen icon. Open the
          game URL that ends with <strong>index.html</strong>, then Share →{' '}
          <strong>Add to Home Screen</strong>. Delete any old icon that showed
          an error first.
        </p>
        <button
          type="button"
          className="fullscreen-hint__btn"
          onClick={dismissHomeScreenHint}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
