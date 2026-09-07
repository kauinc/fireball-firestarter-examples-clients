import { ChipStack } from './ChipStack.jsx'
import { getComboBarIcon, getComboBarIconVariant } from '../utils/comboBars.js'
import { comboTarget } from '../utils/betTargets.js'
import { uiAssets } from '../assets/uiAssets.js'

const comboDropTarget = comboTarget()

/**
 * Regular COMBO payout bar.
 * idle → ComboBar; picking → ComboBar_Active (glow padded, scaled to solid body).
 */
export function ComboBar({
  active = false,
  onToggle,
  disabled = false,
  readOnly = false,
  paysMultiplier = 'x500',
  comboPick = null,
  comboBet = null,
  onPlaceBet,
  settleClass = '',
  comboPickRequired = false,
}) {
  const pickIcon =
    !active && comboPick
      ? getComboBarIcon(comboPick.kind, comboPick.key)
      : null
  const pickVariant = comboPick
    ? getComboBarIconVariant(comboPick.kind)
    : null
  const dropEnabled =
    !readOnly && !active && !disabled && (!comboPickRequired || comboPick)
  const shellAsset = active ? uiAssets.comboBarActive : uiAssets.comboBar
  const isInactiveShell = false

  function placeOnCombo() {
    if (!dropEnabled) return
    onPlaceBet?.(comboDropTarget)
  }

  function handleShellPointerUp(event) {
    if (event.button !== 0) return
    if (event.target.closest('.combo-bar__open')) return
    placeOnCombo()
  }

  const shellStyle = active
    ? { '--combo-shell-bg': `url(${shellAsset})` }
    : { backgroundImage: `url(${shellAsset})` }

  return (
    <article
      className={`combo-bar${active ? ' is-active' : ''}${isInactiveShell ? ' is-inactive' : ''}`}
      aria-label="Combo"
    >
      <h3 className="combo-bar__caption">COMBO</h3>
      <div className="combo-bar__track">
        <div className="combo-bar__pays">
          <span className="combo-bar__pays-label">PAYS</span>
          <span className="combo-bar__pays-value">{paysMultiplier}</span>
        </div>
        <div
          className="combo-bar__shell"
          style={shellStyle}
          data-bet-drop={
            dropEnabled ? JSON.stringify(comboDropTarget) : undefined
          }
          onPointerUp={handleShellPointerUp}
        >
          <div className="combo-bar__content">
            {readOnly ? (
              <span className="combo-bar__open combo-bar__open--label">
                <span className="combo-bar__open-label combo-bar__open-label--full">
                  1st 2nd &amp; 3rd:
                </span>
                <span className="combo-bar__open-label combo-bar__open-label--compact" aria-hidden="true">
                  1·2·3
                </span>
              </span>
            ) : (
              <button
                type="button"
                className="combo-bar__open"
                disabled={disabled}
                aria-pressed={active}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggle?.()
                }}
                onPointerUp={(event) => event.stopPropagation()}
              >
                <span className="combo-bar__open-label combo-bar__open-label--full">
                  1st 2nd &amp; 3rd:
                </span>
                <span className="combo-bar__open-label combo-bar__open-label--compact" aria-hidden="true">
                  1·2·3
                </span>
                {pickIcon ? (
                  <img
                    src={pickIcon}
                    alt=""
                    className={`combo-bar__pick-icon combo-bar__pick-icon--${pickVariant}`}
                    draggable={false}
                  />
                ) : null}
              </button>
            )}
            {readOnly && pickIcon ? (
              <img
                src={pickIcon}
                alt=""
                className={`combo-bar__pick-icon combo-bar__pick-icon--${pickVariant}`}
                draggable={false}
              />
            ) : null}
          </div>
          {comboBet ? (
            <span
              className={`combo-bar__chip${settleClass}`}
              data-bet-id={comboBet.id}
              onPointerUp={(event) => {
                if (!dropEnabled || event.button !== 0) return
                event.stopPropagation()
                placeOnCombo()
              }}
            >
              <ChipStack chips={comboBet.chips} />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
