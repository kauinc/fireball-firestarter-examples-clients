/**
 * Timer bar from product mockup (TimerBar.png / Yellow / Red):
 * optional title above the metallic bar with the value inside.
 * Race HUD reuses the same bar (MM:SS, no title).
 *
 * Tick values are not announced (would spam every second). Phase/label
 * changes use polite live region.
 */
import { uiAssets } from '../assets/uiAssets.js'
import { TimerBarVariant } from '../constants/bettingPhase.js'

const TIMER_BAR_SRC = Object.freeze({
  [TimerBarVariant.DEFAULT]: uiAssets.timerBar,
  [TimerBarVariant.YELLOW]: uiAssets.timerBarYellow,
  [TimerBarVariant.RED]: uiAssets.timerBarRed,
  [TimerBarVariant.FLASH]: uiAssets.timerBarRed,
})

export function BettingBanner({
  label = null,
  secondsLeft,
  variant = TimerBarVariant.DEFAULT,
}) {
  const flashing = variant === TimerBarVariant.FLASH
  const chromeSrc = TIMER_BAR_SRC[variant] ?? uiAssets.timerBar

  return (
    <div
      className="betting-banner"
      data-timer-variant={variant}
    >
      {label != null && label !== '' ? (
        <p className="betting-banner__label" role="status" aria-live="polite">
          {label}
        </p>
      ) : null}
      <div className="betting-banner__pill" aria-hidden="true">
        {flashing ? (
          <>
            <span
              className="betting-banner__chrome betting-banner__chrome--under"
              style={{ backgroundImage: `url(${uiAssets.timerBarYellow})` }}
            />
            <span
              className="betting-banner__chrome betting-banner__chrome--flash"
              style={{ backgroundImage: `url(${uiAssets.timerBarRed})` }}
            />
          </>
        ) : (
          <span
            className="betting-banner__chrome"
            style={{ backgroundImage: `url(${chromeSrc})` }}
          />
        )}
        <span className="betting-banner__value">{secondsLeft}</span>
      </div>
    </div>
  )
}
