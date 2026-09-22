import { DoofGrid } from '../../betting/components/DoofGrid.jsx'
import { ChipStack } from '../../betting/components/ChipStack.jsx'
import { CrazyCombos } from '../../betting/components/CrazyCombos.jsx'
import { HistoryControl } from '../../betting/components/HistoryControl.jsx'
import { uiAssets } from '../../betting/assets/uiAssets.js'
import { DOOF_ACCESSORIES } from '../../betting/constants/doofs.js'
import { accessoryTarget } from '../../betting/utils/betTargets.js'
import { formatMoney } from '../../betting/utils/formatMoney.js'
import { usePublishedRoundBets } from '../../betting/state/roundBetsStore.js'
import '../../betting/styles/crazy-combos.css'

/**
 * Read-only results board — same geometry as betting / race CURRENT BETS.
 * Landscape includes HISTORY for podium→history flights.
 * Portrait matches the betting table (no History).
 */
export function SettlementBoard({
  bets = [],
  didWin = false,
  displayedWin = 0,
  settleByBetId = null,
  hideSettledChips = false,
  boardRef = null,
  winBarRef = null,
  historyOpen = false,
  onHistoryOpenChange,
  historyPanelRef = null,
  historyLanded = false,
  showHistoryControl = true,
  portrait = false,
  /** When false, TOTAL WIN is rendered by the overlay (portrait banner slot). */
  showWinBarInBoard = true,
}) {
  const { comboPick: publishedComboPick, crazyComboPicks: publishedCrazyComboPicks } =
    usePublishedRoundBets()

  const labelBets = bets.filter(
    (bet) => bet.target.type === 'color' || bet.target.type === 'pattern',
  )
  const accessoryBets = bets.filter((bet) => bet.target.type === 'accessory')
  const comboBet = bets.find((bet) => bet.target.type === 'combo') ?? null
  const crazyComboBet = bets.find((bet) => bet.target.type === 'crazyCombo') ?? null
  const showWinBar = didWin && showWinBarInBoard

  const winBar = showWinBar ? (
    <div className="settlement-win" role="status">
      <span className="settlement-win__label">TOTAL WIN:</span>
      <div className="settlement-win__bar" ref={winBarRef}>
        <strong className="settlement-win__amount">
          {formatMoney(displayedWin)}
        </strong>
      </div>
    </div>
  ) : null

  const grid = (
    <DoofGrid
      disabled
      bets={bets}
      labelBets={labelBets}
      settleByBetId={settleByBetId}
      hideSettledChips={hideSettledChips}
      portrait={portrait}
    />
  )

  const rails = (
    <div className="mid-controls-stack is-crazy">
      <div className="mid-controls">
        {showHistoryControl && !portrait ? (
          <HistoryControl
            open={historyOpen}
            onOpenChange={onHistoryOpenChange}
            panelRef={historyPanelRef}
            landed={historyLanded}
          />
        ) : null}

        <div className="mid-controls__accessories" aria-label="Accessory bets">
          {DOOF_ACCESSORIES.map((item) => {
            const stack = accessoryBets.find(
              (bet) =>
                bet.target.type === 'accessory' &&
                bet.target.accessory === item,
            )
            const iconSrc =
              item === 'Hats' ? uiAssets.hatIcon : uiAssets.glassesIcon
            const outcome = stack ? settleByBetId?.[stack.id] : null
            const settleClass = outcome
              ? ` is-settle-${outcome}${hideSettledChips ? ' is-settle-gone' : ''}`
              : ''
            return (
              <div
                key={item}
                className="mid-controls__accessory"
                style={{
                  backgroundImage: `url(${uiAssets.hatsGlassesBar})`,
                  '--accessory-bar-image': `url(${uiAssets.hatsGlassesBar})`,
                }}
                data-bet-drop={JSON.stringify(accessoryTarget(item))}
              >
                <span className="mid-controls__accessory-label">{item}</span>
                <img
                  src={iconSrc}
                  alt=""
                  className={`mid-controls__accessory-icon${
                    item === 'Glasses'
                      ? ' mid-controls__accessory-icon--glasses'
                      : ''
                  }`}
                  draggable={false}
                />
                {stack ? (
                  <span
                    className={`mid-controls__accessory-chip${settleClass}`}
                    data-bet-id={stack.id}
                  >
                    <ChipStack chips={stack.chips} />
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="crazy-combos-row">
        <CrazyCombos
          readOnly
          showComboBar
          showCrazyComboBar
          comboPick={publishedComboPick}
          crazyComboPicks={publishedCrazyComboPicks}
          comboBet={comboBet}
          crazyComboBet={crazyComboBet}
          settleClass={
            comboBet && settleByBetId?.[comboBet.id]
              ? ` is-settle-${settleByBetId[comboBet.id]}${
                  hideSettledChips ? ' is-settle-gone' : ''
                }`
              : ''
          }
          crazyComboSettleClass={
            crazyComboBet && settleByBetId?.[crazyComboBet.id]
              ? ` is-settle-${settleByBetId[crazyComboBet.id]}${
                  hideSettledChips ? ' is-settle-gone' : ''
                }`
              : ''
          }
        />
      </div>
    </div>
  )

  // Portrait: direct HUD children so shared portrait.css grid areas apply.
  if (portrait) {
    return (
      <>
        {grid}
        {rails}
      </>
    )
  }

  return (
    <div className="settlement-board" ref={boardRef}>
      {winBar}
      {grid}
      {rails}
    </div>
  )
}
