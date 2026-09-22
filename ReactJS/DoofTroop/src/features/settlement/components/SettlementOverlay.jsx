import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SettlementBoard } from './SettlementBoard.jsx'
import { SettlementFlightLayer } from './SettlementFlightLayer.jsx'
import { SettlementPodiumLabels } from './SettlementPodiumLabels.jsx'
import { uiAssets } from '../../betting/assets/uiAssets.js'
import { formatMoney } from '../../betting/utils/formatMoney.js'
import { useCurrentRound } from '../../betting/hooks/useCurrentRound.js'
import { useHudViewportContext } from '../../hud/index.js'
import { usePublishedRoundBets } from '../../betting/state/roundBetsStore.js'
import {
  beginHistoryInsert,
  finishHistoryInsert,
  historyRowFromWinners,
} from '../../betting/state/historyStore.js'
import { useSettlementOverlayState } from '../hooks/useSettlementOverlay.js'
import { useChipSettleAnimation } from '../hooks/useChipSettleAnimation.js'
import { useHistoryInsertAnimation } from '../hooks/useHistoryInsertAnimation.js'
import { sumBetTotal } from '../../betting/utils/betTotals.js'
import { DEFAULT_BALANCE } from '../../betting/constants/defaults.js'
import {
  HudFade,
  HudMenuChrome,
  getDoofColorBarsFadeAnchorTop,
  useSyncHudFadeHeight,
} from '../../hud/index.js'
import { playSfx } from '../../../shared/audio/index.js'
import '../../betting/styles/hud-shared.css'
import '../../betting/styles/portrait.css'
import '../styles/settlement.css'

/**
 * Game settlement HUD — RESULTS_SENT.
 * Chips resolve roulette-style; podium icons fly into HISTORY (landscape only).
 */
export function SettlementOverlay({ balance = DEFAULT_BALANCE }) {
  const {
    scale: viewportScale,
    compact,
    orientation,
    portraitVideoPx,
  } = useHudViewportContext()
  const isPortrait = orientation === 'portrait'
  const { round, status } = useCurrentRound()
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

  // Landscape only: open History + fly podium doofs into the sheet.
  const { historyFlights, historyLanded } = useHistoryInsertAnimation({
    enabled: Boolean(isSettlementUiVisible && settlement && !isPortrait),
    roundId: settlementRoundId,
    winners: settlement?.winners ?? [],
    historyOpen,
    onEnsureHistoryOpen: ensureHistoryOpen,
    readyForInsert: readyForHistoryInsert,
    podiumRef,
    historyPanelRef,
  })

  // Portrait: still commit the history row (no UI / no fly-in).
  const silentHistoryKeyRef = useRef('')
  useEffect(() => {
    if (!isPortrait || !isSettlementUiVisible || !settlement || !settlementRoundId) {
      return
    }
    if (!readyForHistoryInsert) return
    const key = String(settlementRoundId)
    if (silentHistoryKeyRef.current === key) return

    const row = historyRowFromWinners(key, settlement.winners)
    const began = beginHistoryInsert(row)
    silentHistoryKeyRef.current = key
    if (began.alreadyPresent && !began.exitingId) return
    finishHistoryInsert()
  }, [
    isPortrait,
    isSettlementUiVisible,
    settlement,
    settlementRoundId,
    readyForHistoryInsert,
  ])

  const allFlights = useMemo(
    () => (isPortrait ? flights : [...flights, ...historyFlights]),
    [isPortrait, flights, historyFlights],
  )

  const getFadeAnchorTop = useCallback(
    () => getDoofColorBarsFadeAnchorTop(overlayRef.current),
    [],
  )
  useSyncHudFadeHeight({
    enabled: Boolean(isSettlementUiVisible && settlement && !isPortrait),
    overlayRef,
    getAnchorTop: getFadeAnchorTop,
    deps: [viewportScale, compact, visibleBets.length, isPortrait],
  })

  const winAmount =
    settlement?.didWin
      ? phase === 'done'
        ? settlement.totalWin
        : displayedWin
      : 0

  if (!isSettlementUiVisible || !settlement) {
    return null
  }

  const board = (
    <SettlementBoard
      bets={visibleBets}
      didWin={settlement.didWin}
      displayedWin={winAmount}
      settleByBetId={settleByBetId}
      hideSettledChips={hideSourceChips}
      boardRef={isPortrait ? null : boardRef}
      winBarRef={isPortrait ? null : winBarRef}
      historyOpen={isPortrait ? false : historyOpen}
      onHistoryOpenChange={isPortrait ? undefined : setHistoryOpen}
      historyPanelRef={historyPanelRef}
      historyLanded={historyLanded}
      showHistoryControl={!isPortrait}
      portrait={isPortrait}
      showWinBarInBoard={!isPortrait}
    />
  )

  const metersFooter = (
    <footer
      className={`betting-footer settlement-overlay__footer${
        isPortrait ? ' settlement-overlay__footer--meters-only' : ''
      }`}
    >
      <div className="betting-footer__balance-wrap">
        <span className="betting-footer__caption">BALANCE:</span>
        <div
          className="betting-footer__meter"
          style={{ backgroundImage: `url(${uiAssets.balanceBar})` }}
        >
          {formatMoney(balance)}
        </div>
      </div>

      {isPortrait ? null : (
        <div className="settlement-overlay__mid" aria-hidden="true" />
      )}

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
  )

  return (
    <div
      ref={overlayRef}
      className={`settlement-overlay${settlement.didWin ? ' is-win' : ' is-lose'}`}
      data-compact={compact ? 'true' : undefined}
      data-orientation={orientation}
      data-settle-phase={phase}
      data-round-id={round?.id ?? undefined}
      data-round-status={status ?? undefined}
      style={{
        '--hud-scale': viewportScale,
        ...(isPortrait && portraitVideoPx > 0
          ? { '--portrait-video-h': `${portraitVideoPx}px` }
          : null),
      }}
    >
      <SettlementPodiumLabels
        winners={settlement.winners}
        podiumRef={podiumRef}
      />
      <SettlementFlightLayer flights={allFlights} />

      {compact ? <HudMenuChrome placement="top" /> : null}

      <HudFade />

      {isPortrait && settlement.didWin ? (
        <div className="settlement-win settlement-win--portrait" role="status">
          <span className="settlement-win__label">TOTAL WIN:</span>
          <div className="settlement-win__bar" ref={winBarRef}>
            <strong className="settlement-win__amount">
              {formatMoney(winAmount)}
            </strong>
          </div>
        </div>
      ) : null}

      <div className="betting-overlay__bottom">
        <div
          className="betting-overlay__hud"
          ref={isPortrait ? boardRef : undefined}
        >
          {board}
          {metersFooter}
        </div>
      </div>

      {compact ? null : <HudMenuChrome placement="footer" />}
    </div>
  )
}
