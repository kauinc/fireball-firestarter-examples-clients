/**
 * Timer bar from product mockup (TimerBar.png):
 * optional title above the metallic bar with the value inside.
 * Race HUD reuses the same bar (MM:SS, no title).
 *
 * Tick values are not announced (would spam every second). Phase/label
 * changes use polite live region.
 */
import { uiAssets } from '../assets/uiAssets.js'

export function BettingBanner({ label = null, secondsLeft }) {
  return (
    <div className="betting-banner">
      {label != null && label !== '' ? (
        <p className="betting-banner__label" role="status" aria-live="polite">
          {label}
        </p>
      ) : null}
      <div className="betting-banner__pill" aria-hidden="true">
        <span
          className="betting-banner__chrome"
          style={{ backgroundImage: `url(${uiAssets.timerBar})` }}
        />
        <span className="betting-banner__value">{secondsLeft}</span>
      </div>
    </div>
  )
}
