import {
  formatMultiplier,
  payoutMultiplier,
} from '../../../shared/balancing/index.js'
import { ComboBar } from './ComboBar.jsx'
import { CrazyComboBar } from './CrazyComboBar.jsx'

/**
 * Combo payout bars — regular COMBO (C_Bar) + CRAZY COMBO row.
 */
export function CrazyCombos({
  comboActive = false,
  onComboToggle,
  onComboClear,
  comboDisabled = false,
  comboPick = null,
  comboBet = null,
  crazyComboBet = null,
  onPlaceBet,
  settleClass = '',
  crazyComboSettleClass = '',
  readOnly = false,
  showComboBar = true,
  showCrazyComboBar = true,
  comboPickRequired = false,
  crazyComboPickActive = false,
  crazyComboActiveSlot = null,
  crazyComboPicks = {},
  onCrazyComboBarClick,
  onCrazyComboClear,
  crazyComboDisabled = false,
}) {
  if (!showComboBar && !showCrazyComboBar) return null

  const comboPays = payoutMultiplier({ type: 'combo' }, null, { comboPick })
  const crazyPays = payoutMultiplier({ type: 'crazyCombo' }, null)

  return (
    <div className="crazy-combos" role="group" aria-label="Combo payouts">
      {showComboBar ? (
        <ComboBar
          active={comboActive}
          onToggle={onComboToggle}
          onClear={onComboClear}
          disabled={comboDisabled}
          readOnly={readOnly}
          comboPick={comboPick}
          comboBet={comboBet}
          onPlaceBet={onPlaceBet}
          settleClass={settleClass}
          comboPickRequired={comboPickRequired}
          paysMultiplier={formatMultiplier(comboPays)}
        />
      ) : null}
      {showCrazyComboBar ? (
        <CrazyComboBar
          readOnly={readOnly}
          disabled={crazyComboDisabled}
          pickActive={crazyComboPickActive}
          activeSlot={crazyComboActiveSlot}
          picks={crazyComboPicks}
          onBarClick={onCrazyComboBarClick}
          onClear={onCrazyComboClear}
          crazyComboBet={crazyComboBet}
          onPlaceBet={onPlaceBet}
          settleClass={crazyComboSettleClass}
          paysMultiplier={formatMultiplier(crazyPays)}
        />
      ) : null}
    </div>
  )
}
