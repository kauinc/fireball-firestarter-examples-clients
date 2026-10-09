import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SettlementBoard } from './SettlementBoard.jsx'
import { SettlementFlightLayer } from './SettlementFlightLayer.jsx'
import { SettlementPodiumLabels } from './SettlementPodiumLabels.jsx'
import { uiAssets } from '../../betting/assets/uiAssets.js'
import { formatMoney } from '../../betting/utils/formatMoney.js'
import { roundMoney } from '../../betting/utils/chipMath.js'
import { useCurrentRound } from '../../betting/hooks/useCurrentRound.js'
import { useHudViewportContext } from '../../hud/index.js'
import { usePublishedRoundBets } from '../../betting/state/roundBetsStore.js'
import { setCarryForwardBets } from '../../betting/state/carryForwardBetsStore.js'
import { useBalance, wasWinCredited } from '../../betting/state/balanceStore.js'
import { emptyCrazyComboPicks } from '../../betting/constants/combo.js'
import {
  beginHistoryInsert,
  finishHistoryInsert,
  historyRowFromWinners,
} from '../../betting/state/historyStore.js'
import { useSettlementOverlayState } from '../hooks/useSettlementOverlay.js'
import {
  useChipSettleAnimation,
  WIN_BET_SFX_STAGGER_MS,
} from '../hooks/useChipSettleAnimation.js'
import { useHistoryInsertAnimation } from '../hooks/useHistoryInsertAnimation.js'
import { sumBetTotal } from '../../betting/utils/betTotals.js'
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
 * Wallet credit happens in `reconcileRoundWallet` (round feed); this overlay only
 * defers the displayed balance until the count-up finishes.
 */
export function SettlementOverlay() {
  const {
    scale: viewportScale,
    compact,
    orientation,
    portraitVideoPx,
  } = useHudViewportContext()
  const isPortrait = orientation === 'portrait'
  const balance = useBalance()
  const { round, status } = useCurrentRound()
  const {
    roundId: betsRoundId,
    bets,
    comboPick: publishedComboPick,
    crazyComboPicks: publishedCrazyComboPicks,
  } = usePublishedRoundBets()
  const boardRef = useRef(null)
  const overlayRef = useRef(null)
  const winBarRef = useRef(null)
  const podiumRef = useRef(null)
  const historyPanelRef = useRef(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const visibleBets = useMemo(() => {
    if (round?.id == null || String(round.id) !== String(betsRoundId ?? '')) {
      return []
    }
    return bets
  }, [round?.id, betsRoundId, bets])

  const totalBet = sumBetTotal(visibleBets)
  const hasBets = visibleBets.length > 0

  const { isSettlementUiVisible, settlement, settlementRoundId } =
    useSettlementOverlayState({
      status,
      round,
      bets: visibleBets,
      comboPick: publishedComboPick,
      crazyComboPicks: publishedCrazyComboPicks,
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

  // Keep winning chips + combo / crazy-combo picks for the next betting board.
  useEffect(() => {
    if (!isSettlementUiVisible || !settlement || !settlementRoundId) return
    const byId = settlement.outcomes?.byId ?? {}
    const winningBets = visibleBets.filter((bet) => byId[bet.id]?.won)
    setCarryForwardBets({
      fromRoundId: settlementRoundId,
      bets: winningBets,
      // Picks persist across rounds even when those bars did not win.
      comboPick: publishedComboPick,
      crazyComboPicks: publishedCrazyComboPicks ?? emptyCrazyComboPicks(),
    })
  }, [
    isSettlementUiVisible,
    settlement,
    settlementRoundId,
    visibleBets,
    publishedComboPick,
    publishedCrazyComboPicks,
  ])

  // Wallet already includes the win (reconcileRoundWallet). Hold it back in the
  // footer until the count-up / idle-no-bets moment so the bar doesn't jump early.
  const winAnimPending =
    Boolean(settlement?.totalWin > 0) &&
    wasWinCredited(settlementRoundId) &&
    (hasBets ? phase !== 'done' && phase !== 'idle' : false)
  const displayBalance = winAnimPending
    ? roundMoney(balance - settlement.totalWin)
    : balance

  const settlePhaseRef = useRef('')
  const winBetSfxTimersRef = useRef([])
  useEffect(() => {
    if (!isSettlementUiVisible || !settlement) return
    if (settlePhaseRef.current === phase) return
    const prev = settlePhaseRef.current
    settlePhaseRef.current = phase

    for (const id of winBetSfxTimersRef.current) window.clearTimeout(id)
    winBetSfxTimersRef.current = []

    if (phase === 'highlight' && prev !== 'highlight') {
      const winCount =
        settlement.winCount ?? settlement.outcomes?.winCount ?? 0
      for (let i = 0; i < winCount; i += 1) {
        const timerId = window.setTimeout(() => {
          playSfx('settleWinBet')
        }, i * WIN_BET_SFX_STAGGER_MS)
        winBetSfxTimersRef.current.push(timerId)
      }
    }
    if (phase === 'fly' && prev !== 'fly') {
      const hasLoseFlight = flights.some((f) => f.outcome === 'lose')
      if (hasLoseFlight) playSfx('settleChipFall')
    }
    if (phase === 'count' && prev !== 'count') {
      playSfx('settleCountUp')
    }
  }, [phase, flights, isSettlementUiVisible, settlement])

  useEffect(() => {
    return () => {
      for (const id of winBetSfxTimersRef.current) window.clearTimeout(id)
      winBetSfxTimersRef.current = []
    }
  }, [])

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
          {formatMoney(displayBalance)}
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
