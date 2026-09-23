import { CHIP_METALS, CHIP_METAL_LABELS } from '../constants/doofs.js'
import { uiAssets } from '../assets/uiAssets.js'
import { formatMoney } from '../utils/formatMoney.js'
import { HudMenuChrome } from '../../hud/index.js'

function formatChipFace(value) {
  return `€${value}`
}

/**
 * Bottom chrome:
 * Desktop — Balance · Clear · Undo · chips · ± · Repeat · x2 · Total Bet · menu
 * Compact — same row, scaled; Balance | Total Bet at ends
 *
 * All three metals share the same stake; +/- steps CHIP_VALUES.
 */
export function BettingFooter({
  disabled = false,
  stakeValue,
  selectedMetal = 'gold',
  onSelectMetal,
  onChipDragStart,
  onClear,
  onUndo,
  onRepeat,
  onDouble,
  onIncreaseChip,
  onDecreaseChip,
  canUndo = false,
  canRepeat = false,
  canDouble = false,
  balance = 5100,
  totalBet = 0,
  hideMenu = false,
}) {
  return (
    <footer className="betting-footer">
      <div className="betting-footer__balance-wrap">
        <span className="betting-footer__caption">BALANCE:</span>
        <div
          className="betting-footer__meter"
          style={{ backgroundImage: `url(${uiAssets.balanceBar})` }}
        >
          {formatMoney(balance)}
        </div>
      </div>

      <div className="betting-footer__tray">
        <button
          type="button"
          className="betting-footer__round"
          style={{ backgroundImage: `url(${uiAssets.roundButton})` }}
          disabled={disabled || !onClear || totalBet <= 0}
          onClick={onClear}
        >
          CLEAR
        </button>

        <button
          type="button"
          className="betting-footer__round"
          style={{ backgroundImage: `url(${uiAssets.roundButton})` }}
          disabled={disabled || !onUndo || !canUndo}
          onClick={onUndo}
        >
          UNDO
        </button>

        <div className="betting-footer__chips" role="group" aria-label="Chips">
          {CHIP_METALS.map((metal) => {
            const selected = selectedMetal === metal
            const isWinner = metal === 'gold'
            const src = selected
              ? (uiAssets.chipsSelected[metal] ?? uiAssets.chips[metal])
              : uiAssets.chips[metal]
            return (
              <div
                key={metal}
                className={`betting-footer__chip-slot${isWinner ? ' betting-footer__chip-slot--winner' : ''}`}
              >
                <span className="betting-footer__chip-label">
                  {CHIP_METAL_LABELS[metal]}
                </span>
                <button
                  type="button"
                  className={`betting-footer__chip${selected ? ' is-selected' : ''}`}
                  disabled={disabled}
                  aria-label={CHIP_METAL_LABELS[metal]}
                  aria-pressed={selected}
                  onClick={(event) => {
                    // Mouse already selected on pointerdown; detail===0 is keyboard.
                    if (event.detail === 0) onSelectMetal?.(metal)
                  }}
                  onPointerDown={(event) => {
                    if (disabled || event.button !== 0) return
                    onSelectMetal?.(metal)
                    onChipDragStart?.(event, stakeValue, metal)
                  }}
                >
                  {src ? <img src={src} alt="" draggable={false} /> : null}
                  <span>{formatChipFace(stakeValue)}</span>
                </button>
              </div>
            )
          })}

          <div className="betting-footer__stake-step" role="group" aria-label="Change stake">
            <button
              type="button"
              className="betting-footer__stake-btn"
              disabled={disabled || !onIncreaseChip}
              aria-label="Increase stake"
              onClick={onIncreaseChip}
            >
              <img src={uiAssets.increaseBet} alt="" draggable={false} />
            </button>
            <button
              type="button"
              className="betting-footer__stake-btn"
              disabled={disabled || !onDecreaseChip}
              aria-label="Decrease stake"
              onClick={onDecreaseChip}
            >
              <img src={uiAssets.decreaseBet} alt="" draggable={false} />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="betting-footer__round betting-footer__round--wide"
          style={{ backgroundImage: `url(${uiAssets.roundButton})` }}
          disabled={disabled || !onRepeat || !canRepeat}
          onClick={onRepeat}
        >
          REPEAT
          <br />
          LAST
        </button>

        <button
          type="button"
          className="betting-footer__round"
          style={{ backgroundImage: `url(${uiAssets.roundButton})` }}
          disabled={disabled || !onDouble || !canDouble}
          onClick={onDouble}
        >
          x2
        </button>
      </div>

      <div className="betting-footer__total-wrap">
        <span className="betting-footer__caption">TOTAL BET:</span>
        <div
          className="betting-footer__meter"
          style={{ backgroundImage: `url(${uiAssets.balanceBar})` }}
        >
          {formatMoney(totalBet)}
        </div>
      </div>

      {hideMenu ? null : <HudMenuChrome placement="footer" />}
    </footer>
  )
}
