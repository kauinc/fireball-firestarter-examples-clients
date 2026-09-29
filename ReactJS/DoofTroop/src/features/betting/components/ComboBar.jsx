import { ChipStack } from './ChipStack.jsx'
import { getComboBarIcon, getComboBarIconVariant } from '../utils/comboBars.js'
import { comboTarget } from '../utils/betTargets.js'
import { uiAssets } from '../assets/uiAssets.js'

const comboDropTarget = comboTarget()

/**
 * Regular COMBO payout bar (mirrors Crazy Combo’s three shell states):
 * - no bet: ComboBar_NoBet
 * - selected: ComboBar (+ pick icon)
 * - active/picking: ComboBar_Active (same canvas size as ComboBar)
 *
 * PICK / CLEAR round button opens or resets the combo selection.
 * The shell itself is bet-only.
 */
export function ComboBar({
  active = false,
  onToggle,
  onClear,
  disabled = false,
  readOnly = false,
  paysMultiplier = 'x500',
  comboPick = null,
  comboBet = null,
  onPlaceBet,
  settleClass = '',
  comboPickRequired = false,
}) {
  const hasPick = Boolean(comboPick)
  const pickIcon =
    !active && hasPick
      ? getComboBarIcon(comboPick.kind, comboPick.key)
      : null
  const pickVariant = hasPick
    ? getComboBarIconVariant(comboPick.kind)
    : null
  const dropEnabled =
    !readOnly && !active && !disabled && (!comboPickRequired || hasPick)
  const shellAsset = active
    ? uiAssets.comboBarActive
    : hasPick
      ? uiAssets.comboBar
      : uiAssets.comboBarNoBet
  const isInactiveShell = !active && !hasPick
  const actionLabel = hasPick ? 'CLEAR' : 'PICK'

  function placeOnCombo() {
    if (!dropEnabled) return
    onPlaceBet?.(comboDropTarget)
  }

  function handleShellPointerUp(event) {
    if (event.button !== 0) return
    placeOnCombo()
  }

  function handleActionClick(event) {
    event.stopPropagation()
    if (disabled) return
    if (hasPick) onClear?.()
    else onToggle?.()
  }

  const shellStyle = {
    // Active art is painted on ::before (desktop) / ::after (portrait) so the
    // glow pad can scale; inline background would show a second, undersized copy.
    ...(active ? {} : { backgroundImage: `url(${shellAsset})` }),
    '--combo-shell-bg': `url(${shellAsset})`,
    '--portrait-shell-bg': `url(${shellAsset})`,
  }

  const openLabel = (
    <>
      <span className="combo-bar__open-label combo-bar__open-label--full">
        <span className="combo-bar__open-line">1st</span>
        <span className="combo-bar__open-line">2nd</span>
        <span className="combo-bar__open-line">&amp; 3rd:</span>
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
    </>
  )

  const actionButton = !readOnly ? (
    <button
      type="button"
      className={`combo-bar__action${hasPick ? ' is-clear' : ' is-pick'}${active ? ' is-active' : ''}`}
      style={{ backgroundImage: `url(${uiAssets.comboBarRoundButton})` }}
      disabled={disabled}
      aria-pressed={active}
      aria-label={hasPick ? 'Clear combo selection' : 'Pick combo'}
      onClick={handleActionClick}
    >
      {actionLabel}
    </button>
  ) : null

  const paysBlock = (
    <div className="combo-bar__pays">
      <span className="combo-bar__pays-label">PAYS</span>
      <span className="combo-bar__pays-value">{paysMultiplier}</span>
    </div>
  )

  return (
    <article
      className={`combo-bar${active ? ' is-active' : ''}${hasPick && !active ? ' is-selected' : ''}${isInactiveShell ? ' is-inactive' : ''}${readOnly ? ' is-readonly' : ''}`}
      aria-label="Combo"
    >
      <div className="combo-bar__rail">
        <h3 className="combo-bar__caption">
          <span className="combo-bar__caption-title">COMBO</span>
        </h3>
        <div className="combo-bar__side">
          {paysBlock}
          {actionButton}
        </div>
      </div>
      <div className="combo-bar__track">
        <div
          className="combo-bar__shell"
          style={shellStyle}
          data-bet-drop={
            dropEnabled ? JSON.stringify(comboDropTarget) : undefined
          }
          onPointerUp={readOnly ? undefined : handleShellPointerUp}
        >
          <div className="combo-bar__content">
            <span className="combo-bar__open combo-bar__open--label">
              {openLabel}
            </span>
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
              <ChipStack chips={comboBet.chips} skin="combo" />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
