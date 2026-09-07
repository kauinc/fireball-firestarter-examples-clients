import { POSITION_OPTIONS } from '../constants/doofs.js'
import { POSITION_LABELS } from '../constants/positions.js'
import { getDoofBoardCell } from '../assets/doofImages.js'
import { isCrazyComboComplete } from '../constants/combo.js'
import { crazyComboTarget } from '../utils/betTargets.js'
import { uiAssets } from '../assets/uiAssets.js'
import { ChipStack } from './ChipStack.jsx'

const crazyComboDropTarget = crazyComboTarget()

/**
 * CRAZY COMBO bar assets:
 * - idle: CrazyComboBar_ActiveBackground
 * - picking: ActiveBackground + CrazyComboBar_ActiveSmall shifted per slot (×3)
 * - complete: CrazyComboBar
 */
export function CrazyComboBar({
  paysMultiplier = 'x5000',
  picks = {},
  activeSlot = null,
  pickActive = false,
  onBarClick,
  disabled = false,
  readOnly = false,
  crazyComboBet = null,
  onPlaceBet,
  settleClass = '',
}) {
  const complete = isCrazyComboComplete(picks)
  const dropEnabled = !readOnly && complete && !pickActive && !disabled
  const pickEnabled = !readOnly && !dropEnabled && !disabled

  const shellClass = [
    'crazy-combo-bar__shell',
    pickActive ? ' is-picking' : '',
    complete && !pickActive ? ' is-complete' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const shellBg =
    complete && !pickActive
      ? uiAssets.crazyComboBarComplete
      : uiAssets.crazyComboBar

  const shellStyle = {
    backgroundImage: `url(${shellBg})`,
  }

  function placeOnCrazyCombo() {
    if (!dropEnabled) return
    onPlaceBet?.(crazyComboDropTarget)
  }

  function handleShellPointerUp(event) {
    if (event.button !== 0) return
    if (event.target.closest('.crazy-combo-bar__slot--interactive')) return
    placeOnCrazyCombo()
  }

  function handleSlotClick(slot) {
    if (!pickEnabled) return
    onBarClick?.(slot)
  }

  const slots = (
    <div className="crazy-combo-bar__slots">
      {POSITION_OPTIONS.map((slot) => {
        const pick = picks[slot] ?? null
        const cell = pick ? getDoofBoardCell(pick.color, pick.pattern) : null
        const isActive = pickActive && activeSlot === slot
        const slotClass = [
          'crazy-combo-bar__slot',
          isActive ? ' is-active' : '',
          pick ? ' has-pick' : '',
          pickEnabled ? ' crazy-combo-bar__slot--interactive' : '',
        ]
          .filter(Boolean)
          .join(' ')

        const slotBody = (
          <>
            <span className="crazy-combo-bar__slot-label">
              {POSITION_LABELS[slot] ?? slot}:
            </span>
            {cell ? (
              <img
                src={cell.src}
                alt=""
                className="crazy-combo-bar__slot-doof"
                draggable={false}
              />
            ) : null}
          </>
        )

        return pickEnabled ? (
          <button
            key={slot}
            type="button"
            className={slotClass}
            aria-pressed={isActive}
            onClick={(event) => {
              event.stopPropagation()
              handleSlotClick(slot)
            }}
            onPointerUp={(event) => event.stopPropagation()}
          >
            {slotBody}
          </button>
        ) : (
          <span key={slot} className={slotClass}>
            {slotBody}
          </span>
        )
      })}
    </div>
  )

  return (
    <article
      className={`crazy-combo-bar${pickActive ? ' is-pick-active' : ''}${complete ? ' is-complete' : ''}`}
      aria-label="Crazy Combo"
    >
      <h3 className="crazy-combo-bar__caption">CRAZY COMBO</h3>
      <div className="crazy-combo-bar__track">
        <div
          className={shellClass}
          style={shellStyle}
          data-bet-drop={
            dropEnabled ? JSON.stringify(crazyComboDropTarget) : undefined
          }
          onPointerUp={readOnly ? undefined : handleShellPointerUp}
        >
          {pickActive && activeSlot ? (
            <span
              className="crazy-combo-bar__selection"
              data-slot={activeSlot}
              style={{ backgroundImage: `url(${uiAssets.ccSelection})` }}
              aria-hidden="true"
            />
          ) : null}
          {slots}
          {crazyComboBet ? (
            <span
              className={`crazy-combo-bar__chip${settleClass}`}
              data-bet-id={crazyComboBet.id}
              onPointerUp={(event) => {
                if (!dropEnabled || event.button !== 0) return
                event.stopPropagation()
                placeOnCrazyCombo()
              }}
            >
              <ChipStack chips={crazyComboBet.chips} />
            </span>
          ) : null}
        </div>
        <div className="crazy-combo-bar__pays">
          <span className="crazy-combo-bar__pays-label">PAYS</span>
          <span className="crazy-combo-bar__pays-value">{paysMultiplier}</span>
        </div>
      </div>
    </article>
  )
}
