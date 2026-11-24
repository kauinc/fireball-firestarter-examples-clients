import { useGamePaused } from '../../../shared/fireball/pauseStore.js'
import { useT } from '../../../shared/i18n/index.js'
import './pause-overlay.css'

/**
 * Full-screen interaction blocker while operator pauses the game.
 * Live stream may keep playing underneath.
 */
export function PauseOverlay() {
  const t = useT()
  const paused = useGamePaused()
  if (!paused) return null

  return (
    <div
      className="pause-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pause-overlay-title"
    >
      <p id="pause-overlay-title" className="pause-overlay__label">
        {t('label_game_paused')}
      </p>
    </div>
  )
}
