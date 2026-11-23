import { CHIP_METALS, CHIP_METAL_LABELS } from '../constants/doofs.js'
import { DEFAULT_BALANCE } from '../constants/defaults.js'
import { uiAssets } from '../assets/uiAssets.js'
import { formatChipFace, formatMoney } from '../utils/formatMoney.js'
import { useT } from '../../../shared/i18n/index.js'
import { HudMenuChrome } from '../../hud/index.js'

/**
 * Bottom chrome:
 * Desktop — Balance · Repeat Last · chips · ± · x2 · Total Bet · menu
 * Compact — same row, scaled; Balance | Total Bet at ends
 *
 * Clear Bets lives on the board (DoofGrid). All three metals share stake; +/- steps CHIP_VALUES.
 */
export function BettingFooter({
  disabled = false,
  stakeValue,
  selectedMetal = 'gold',
  onSelectMetal,
  onChipDragStart,
  onRepeat,
  onDouble,
  onIncreaseChip,
  onDecreaseChip,
  canRepeat = false,
  canDouble = false,
  balance = DEFAULT_BALANCE,
  totalBet = 0,
  hideMenu = false,
}) {
  const t = useT()
  return (
    <footer className="betting-footer">
      <div className="betting-footer__balance-wrap">
        <span className="betting-footer__caption">{t('label_balance')}</span>
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
          className="betting-footer__round betting-footer__round--wide"
          style={{ backgroundImage: `url(${uiAssets.roundButton})` }}
          disabled={disabled || !onRepeat || !canRepeat}
          onClick={onRepeat}
        >
          {t('label_repeat')}
          <br />
          {t('label_last')}
        </button>

        <div className="betting-footer__chips" role="group" aria-label={t('label_chips')}>
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
                  {t(CHIP_METAL_LABELS[metal])}
                </span>
                <button
                  type="button"
                  className={`betting-footer__chip${selected ? ' is-selected' : ''}`}
                  disabled={disabled}
                  aria-label={t(CHIP_METAL_LABELS[metal])}
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

          <div className="betting-footer__stake-step" role="group" aria-label={t('label_change_stake')}>
            <button
              type="button"
              className="betting-footer__stake-btn"
              disabled={disabled || !onIncreaseChip}
              aria-label={t('label_increase_stake')}
              onClick={onIncreaseChip}
            >
              <img src={uiAssets.increaseBet} alt="" draggable={false} />
            </button>
            <button
              type="button"
              className="betting-footer__stake-btn"
              disabled={disabled || !onDecreaseChip}
              aria-label={t('label_decrease_stake')}
              onClick={onDecreaseChip}
            >
              <img src={uiAssets.decreaseBet} alt="" draggable={false} />
            </button>
          </div>
        </div>

        <button
          type="button"
          className="betting-footer__round"
          style={{ backgroundImage: `url(${uiAssets.roundButton})` }}
          disabled={disabled || !onDouble || !canDouble}
          onClick={onDouble}
        >
          {t('label_double')}
        </button>
      </div>

      <div className="betting-footer__total-wrap">
        <span className="betting-footer__caption">{t('label_total_bet')}</span>
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
