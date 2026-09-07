import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SettlementBoard } from './SettlementBoard.jsx'
import { SettlementFlightLayer } from './SettlementFlightLayer.jsx'
import { SettlementPodiumLabels } from './SettlementPodiumLabels.jsx'
import { uiAssets } from '../../betting/assets/uiAssets.js'
import { formatMoney } from '../../betting/utils/formatMoney.js'
import { useCurrentRound } from '../../betting/hooks/useCurrentRound.js'
import { useFullscreen } from '../../betting/hooks/useFullscreen.js'
import { useHudViewportContext } from '../../hud/index.js'
import { usePublishedRoundBets } from '../../betting/state/roundBetsStore.js'
import { useSettlementOverlayState } from '../hooks/useSettlementOverlay.js'
import { useChipSettleAnimation } from '../hooks/useChipSettleAnimation.js'
import { useHistoryInsertAnimation } from '../hooks/useHistoryInsertAnimation.js'
import { sumBetTotal } from '../../betting/utils/betTotals.js'
import { DEFAULT_BALANCE } from '../../betting/constants/defaults.js'
import {
  HudFade,
  HudFullscreenButton,
  HudMenuChrome,
  getDoofColorBarsFadeAnchorTop,
  useSyncHudFadeHeight,
} from '../../hud/index.js'
import { playSfx } from '../../../shared/audio/index.js'
import '../../betting/styles/hud-shared.css'
import '../styles/settlement.css'

/**
 * Game settlement HUD — RESULTS_SENT.
 * Chips resolve roulette-style; podium icons fly into HISTORY.
 */
export function SettlementOverlay({ balance = DEFAULT_BALANCE }) {
  const { scale: viewportScale, compact } = useHudViewportContext()
  const { round, status } = useCurrentRound()
  const { isFullscreen, toggleFullscreen } = useFullscreen()
  const { roundId: betsRoundId, bets } = usePublishedRoundBets()
  const boardRef = useRef(null)
  const overlayRef = useRef(null)
  const winBarRef = useRef(null)
  const podiumRef = useRef(null)
  const historyPanelRef = useRef(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const visibleBets =
    round?.id != null && String(round.id) === String(betsRoundId ?? '')
      ? bets
      : []
  const totalBet = sumBetTotal(visibleBets)
  const hasBets = visibleBets.length > 0

  const { isSettlementUiVisible, settlement, settlementRoundId } =
    useSettlementOverlayState({
      status,
      round,
      bets: visibleBets,
    })

  const settleByBetId = useMemo(() => {
    const byId = settlement?.outcomes?.byId
    if (!byId) return null
    /** @type {Record<string, 'win' | 'lose'>} */
    const map = {}
    for (const [id, result] of Object.entries(byId)) {
      map[id] = result.won ? 'win' : 'lose'
    }
    return map
  }, [settlement])

  const { phase, flights, displayedWin, hideSourceChips } =
    useChipSettleAnimation({
      enabled: Boolean(
        isSettlementUiVisible && settlement && hasBets,
      ),
      bets: visibleBets,
      outcomes: settlement?.outcomes ?? null,
      totalWin: settlement?.totalWin ?? 0,
      boardRef,
      winBarRef,
    })

  const settleStingKeyRef = useRef('')
  useEffect(() => {
    if (!isSettlementUiVisible || !settlement || !settlementRoundId) return
    const key = `${settlementRoundId}:${settlement.didWin ? 'w' : 'l'}`
    if (settleStingKeyRef.current === key) return
    settleStingKeyRef.current = key
    playSfx(settlement.didWin ? 'settleWin' : 'settleLose')
  }, [isSettlementUiVisible, settlement, settlementRoundId])

  const settlePhaseRef = useRef('')
  useEffect(() => {
    if (!isSettlementUiVisible || !settlement) return
    if (settlePhaseRef.current === phase) return
    const prev = settlePhaseRef.current
    settlePhaseRef.current = phase

    if (phase === 'fly' && prev !== 'fly') {
      const hasWinFlight = flights.some((f) => f.outcome === 'win')
      const hasLoseFlight = flights.some((f) => f.outcome === 'lose')
      if (hasWinFlight) playSfx('settleChipFly')
      if (hasLoseFlight) playSfx('settleChipFall')
    }
    if (phase === 'count' && prev !== 'count') {
      playSfx('settleCountUp')
    }
  }, [phase, flights, isSettlementUiVisible, settlement])

  const ensureHistoryOpen = useCallback(() => {
    setHistoryOpen(true)
  }, [])

  const readyForHistoryInsert =
    Boolean(isSettlementUiVisible && settlement) &&
    (hasBets ? phase === 'done' : true)

  const { historyFlights, historyLanded } = useHistoryInsertAnimation({
    enabled: Boolean(isSettlementUiVisible && settlement),
    roundId: settlementRoundId,
    winners: settlement?.winners ?? [],
    historyOpen,
    onEnsureHistoryOpen: ensureHistoryOpen,
    readyForInsert: readyForHistoryInsert,
    podiumRef,
    historyPanelRef,
  })

  const allFlights = useMemo(
    () => [...flights, ...historyFlights],
    [flights, historyFlights],
  )

  const getFadeAnchorTop = useCallback(
    () => getDoofColorBarsFadeAnchorTop(overlayRef.current),
    [],
  )
  useSyncHudFadeHeight({
    enabled: Boolean(isSettlementUiVisible && settlement),
    overlayRef,
    getAnchorTop: getFadeAnchorTop,
    deps: [viewportScale, compact, visibleBets.length],
  })

  if (!isSettlementUiVisible || !settlement) {
    return null
  }

  return (
    <div
      ref={overlayRef}
      className={`settlement-overlay${settlement.didWin ? ' is-win' : ' is-lose'}`}
      data-compact={compact ? 'true' : undefined}
      data-settle-phase={phase}
      data-round-id={round?.id ?? undefined}
      data-round-status={status ?? undefined}
      style={{ '--hud-scale': viewportScale }}
    >
      <SettlementPodiumLabels
        winners={settlement.winners}
        podiumRef={podiumRef}
      />
      <SettlementFlightLayer flights={allFlights} />

      {compact ? <HudMenuChrome placement="top" /> : null}

      <HudFade />

      <div className="betting-overlay__bottom">
        <div className="betting-overlay__hud">
          <SettlementBoard
            bets={visibleBets}
            didWin={settlement.didWin}
            displayedWin={
              settlement.didWin
                ? phase === 'done'
                  ? settlement.totalWin
                  : displayedWin
                : 0
            }
            settleByBetId={settleByBetId}
            hideSettledChips={hideSourceChips}
            boardRef={boardRef}
            winBarRef={winBarRef}
            historyOpen={historyOpen}
            onHistoryOpenChange={setHistoryOpen}
            historyPanelRef={historyPanelRef}
            historyLanded={historyLanded}
          />

          <footer className="betting-footer settlement-overlay__footer">
            <div className="betting-footer__balance-wrap">
              <span className="betting-footer__caption">BALANCE:</span>
              <div
                className="betting-footer__meter"
                style={{ backgroundImage: `url(${uiAssets.balanceBar})` }}
              >
                {formatMoney(balance)}
              </div>
            </div>

            <div className="settlement-overlay__mid" aria-hidden="true" />

            <div className="betting-footer__total-wrap">
              <span className="betting-footer__caption">TOTAL BET:</span>
              <div
                className="betting-footer__meter"
                style={{ backgroundImage: `url(${uiAssets.balanceBar})` }}
              >
                {formatMoney(totalBet)}
              </div>
            </div>
          </footer>
        </div>
      </div>

      <HudFullscreenButton
        isFullscreen={isFullscreen}
        onToggle={toggleFullscreen}
      />
      {compact ? null : <HudMenuChrome placement="footer" />}
    </div>
  )
}
