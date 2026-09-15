import { DOOF_ACCESSORIES } from '../constants/doofs.js'
import { uiAssets } from '../assets/uiAssets.js'
import { accessoryTarget } from '../utils/betTargets.js'
import { getComboBarState, comboAccessoryPickBarBackground } from '../utils/comboBars.js'
import { ChipStack } from './ChipStack.jsx'
import { HistoryControl } from './HistoryControl.jsx'
import { CrazyCombos } from './CrazyCombos.jsx'

/**
 * HISTORY + Hats / Glasses stay fixed.
 * Combo payout bars sit below the main controls.
 */
export function MidControls({
  accessory: _accessory,
  onAccessoryChange,
  disabled = false,
  bets = [],
  onPlaceBet,
  historyOpen = false,
  onHistoryOpenChange,
  comboActive = false,
  onComboBarPick,
  onComboToggle,
  comboPick = null,
  comboBet = null,
  crazyComboBet = null,
  onPlaceComboBet,
  crazyComboPickActive = false,
  crazyComboActiveSlot = null,
  crazyComboPicks = {},
  onCrazyComboBarClick,
  comboPickRequired = false,
}) {
  return (
    <div
      className={`mid-controls-stack is-crazy${comboActive ? ' is-combo-active' : ''}${crazyComboPickActive ? ' is-crazy-combo-active' : ''}`}
    >
      <div className="mid-controls">
        <HistoryControl open={historyOpen} onOpenChange={onHistoryOpenChange} />

        <div className="mid-controls__accessories">
          {DOOF_ACCESSORIES.map((item) => {
            const stack = bets.find(
              (bet) =>
                bet.target.type === 'accessory' &&
                bet.target.accessory === item,
            )
            const target = accessoryTarget(item)
            const iconSrc =
              item === 'Hats' ? uiAssets.hatIcon : uiAssets.glassesIcon
            const { highlight: accessoryHighlight } = getComboBarState(comboActive)
            const barAsset =
              comboActive && accessoryHighlight
                ? comboAccessoryPickBarBackground()
                : uiAssets.hatsGlassesBar

            function handleAccessoryActivate() {
              if (disabled) return
              if (comboActive && accessoryHighlight) {
                onComboBarPick?.('accessories', item)
                return
              }
              if (onPlaceBet) onPlaceBet(target)
              onAccessoryChange?.(item)
            }

            return (
              <button
                key={item}
                type="button"
                className={`mid-controls__accessory${comboActive && accessoryHighlight ? ' is-combo-inactive' : ''}`}
                style={{ backgroundImage: `url(${barAsset})` }}
                disabled={disabled || crazyComboPickActive}
                data-bet-drop={comboActive ? undefined : JSON.stringify(target)}
                onPointerUp={(event) => {
                  if (disabled || event.button !== 0) return
                  handleAccessoryActivate()
                }}
                onClick={(event) => {
                  if (disabled || event.detail !== 0) return
                  handleAccessoryActivate()
                }}
              >
                <span className="mid-controls__accessory-label">{item}</span>
                <img
                  src={iconSrc}
                  alt=""
                  className="mid-controls__accessory-icon"
                  draggable={false}
                />
                {stack ? (
                  <span className="mid-controls__accessory-chip">
                    <ChipStack chips={stack.chips} />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="crazy-combos-row">
        <CrazyCombos
          comboActive={comboActive}
          onComboToggle={onComboToggle}
          comboDisabled={disabled}
          comboPick={comboPick}
          comboBet={comboBet}
          crazyComboBet={crazyComboBet}
          onPlaceBet={onPlaceComboBet}
          crazyComboPickActive={crazyComboPickActive}
          crazyComboActiveSlot={crazyComboActiveSlot}
          crazyComboPicks={crazyComboPicks}
          onCrazyComboBarClick={onCrazyComboBarClick}
          crazyComboDisabled={disabled || comboActive}
          comboPickRequired={comboPickRequired}
        />
      </div>
    </div>
  )
}
