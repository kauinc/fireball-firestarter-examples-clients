import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BettingBanner } from '../../betting/components/BettingBanner.jsx'
import { uiAssets } from '../../betting/assets/uiAssets.js'
import { formatMoney } from '../../betting/utils/formatMoney.js'
import { getBetTotal } from '../../betting/utils/chipMath.js'
import { useHudViewportContext } from '../../hud/index.js'
import { useCurrentRound } from '../../betting/hooks/useCurrentRound.js'
import { usePublishedRoundBets } from '../../betting/state/roundBetsStore.js'
import {
  useMockPotentialWin,
  useRaceElapsed,
  useRaceOverlayState,
} from '../hooks/useRaceOverlay.js'
import { CurrentBetsBoard } from './CurrentBetsSheet.jsx'
import { DEFAULT_BALANCE } from '../../betting/constants/defaults.js'
import {
  HudFade,
  HudMenuChrome,
  useDialogFocus,
} from '../../hud/index.js'
import { playSfx } from '../../../shared/audio/index.js'
import '../../betting/styles/hud-shared.css'
import '../../betting/styles/crazy-combos.css'
import '../../betting/styles/portrait.css'
import '../styles/race.css'

/**
 * In-race HUD:
 * - Landscape compact: Balance | CURRENT BETS | Potential Win (+ sheet board).
 * - Portrait: same board as betting (read-only), no chip footer; timer on stream edge.
 */
export function RaceOverlay({ balance = DEFAULT_BALANCE }) {
  const {
    scale: viewportScale,
    compact,
    orientation,
    portraitVideoPx,
  } = useHudViewportContext()
  const isPortrait = orientation === 'portrait'
  const { round, status } = useCurrentRound()
  const { isRaceUiVisible, raceKey, raceStartedAt } = useRaceOverlayState({
    status,
    round,
  })
  const { label: elapsedLabel } = useRaceElapsed({
    active: isRaceUiVisible,
    raceStartedAt,
    raceKey,
  })
  const potentialWin = useMockPotentialWin({ active: isRaceUiVisible })
  const { roundId: betsRoundId, bets, comboPick: publishedComboPick, crazyComboPicks: publishedCrazyComboPicks } =
    usePublishedRoundBets()
  const [betsOpenForKey, setBetsOpenForKey] = useState(null)
  // Close CURRENT BETS when the race key changes (new round / phase).
  if (betsOpenForKey != null && betsOpenForKey !== raceKey) {
    setBetsOpenForKey(null)
  }
  const betsOpen = Boolean(
    !isPortrait && isRaceUiVisible && betsOpenForKey === raceKey,
  )
  const betsDialogRef = useRef(null)
  const betsTableRef = useRef(null)
  const currentBetsToggleRef = useRef(null)
  const overlayRef = useRef(null)

  const closeBets = useCallback(() => {
    setBetsOpenForKey(null)
    playSfx('sheetClose')
  }, [])
  useDialogFocus({
    open: betsOpen,
    onClose: closeBets,
    containerRef: betsDialogRef,
  })

  const roundMatches = round?.id != null && String(round.id) === String(betsRoundId ?? '')
  const visibleBets = roundMatches ? bets : []
  const visibleComboPick = roundMatches ? publishedComboPick : null

  const visibleCrazyComboPicks = roundMatches ? publishedCrazyComboPicks : null
  const totalBet = useMemo(
    () =>
      visibleBets.reduce((sum, bet) => sum + getBetTotal(bet), 0),
    [visibleBets],
  )
  const viewportMode = compact ? '1' : '0'

  const showCrazyCombos = true
  const showComboBar = true
  const showCrazyComboBar = true

  function toggleCurrentBets() {
    if (isPortrait) return
    if (betsOpen) {
      setBetsOpenForKey(null)
      playSfx('sheetClose')
      return
    }
    setBetsOpenForKey(raceKey)
    playSfx('sheetOpen')
  }

  useEffect(() => {
    if (!betsOpen) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') closeBets()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [betsOpen, closeBets])

  useLayoutEffect(() => {
    if (isPortrait) return undefined

    const root = overlayRef.current
    if (!root) return undefined

    let syncFrame = 0

    function clearShadeVars() {
      root.classList.remove('is-syncing-toggle')
      root.style.removeProperty('--race-bets-lift')
      root.style.removeProperty('--race-bets-shade-h')
    }

    function syncToggleLift() {
      if (
        !betsOpen ||
        !currentBetsToggleRef.current ||
        !betsTableRef.current
      ) {
        clearShadeVars()
        return
      }

      root.classList.add('is-syncing-toggle')

      const toggleEl = currentBetsToggleRef.current
      const gap = Number.parseFloat(
        getComputedStyle(root).getPropertyValue('--race-current-bets-table-gap'),
      )
      const safeGap = Number.isFinite(gap) ? gap : 0

      // Measure resting toggle (no lift), then lift to sit above the color row.
      root.style.setProperty('--race-bets-lift', '0px')
      const restBottom = toggleEl.getBoundingClientRect().bottom
      const tableTop = betsTableRef.current.getBoundingClientRect().top
      const lift = Math.max(0, Math.round(restBottom - (tableTop - safeGap)))
      root.style.setProperty('--race-bets-lift', `${lift}px`)

      // Shade from overlay bottom → CURRENT BETS top (never above the button).
      const overlayBottom = root.getBoundingClientRect().bottom
      const buttonTop = toggleEl.getBoundingClientRect().top
      root.style.setProperty(
        '--race-bets-shade-h',
        `${Math.max(0, Math.round(overlayBottom - buttonTop))}px`,
      )

      requestAnimationFrame(() => {
        root.classList.remove('is-syncing-toggle')
      })
    }

    function scheduleSyncToggleLift() {
      cancelAnimationFrame(syncFrame)
      syncFrame = requestAnimationFrame(() => {
        syncFrame = requestAnimationFrame(syncToggleLift)
      })
    }

    scheduleSyncToggleLift()

    const table = betsTableRef.current
    const panel = betsDialogRef.current
    const toggle = currentBetsToggleRef.current
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(scheduleSyncToggleLift)
        : null
    if (observer) {
      if (table) observer.observe(table)
      if (panel) observer.observe(panel)
      if (toggle) observer.observe(toggle)
      observer.observe(root)
    }
    window.addEventListener('resize', scheduleSyncToggleLift)

    return () => {
      cancelAnimationFrame(syncFrame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleSyncToggleLift)
      clearShadeVars()
    }
  }, [
    betsOpen,
    isPortrait,
    visibleBets.length,
    showCrazyCombos,
    viewportScale,
    viewportMode,
  ])

  if (!isRaceUiVisible) {
    return null
  }

  const board = (
    <CurrentBetsBoard
      bets={visibleBets}
      tableRef={isPortrait ? null : betsTableRef}
      showCrazyCombos={showCrazyCombos}
      showComboBar={showComboBar}
      showCrazyComboBar={showCrazyComboBar}
      comboPick={visibleComboPick}
      crazyComboPicks={visibleCrazyComboPicks}
      portrait={isPortrait}
    />
  )

  if (isPortrait) {
    return (
      <div
        ref={overlayRef}
        className="race-overlay"
        data-compact={compact ? 'true' : undefined}
        data-orientation="portrait"
        data-round-id={round?.id ?? undefined}
        data-round-status={status ?? undefined}
        style={{
          '--hud-scale': viewportScale,
          ...(portraitVideoPx > 0
            ? { '--portrait-video-h': `${portraitVideoPx}px` }
            : null),
        }}
      >
        <BettingBanner secondsLeft={elapsedLabel} />
        <HudMenuChrome placement="top" />
        <HudFade />

        <div className="betting-overlay__bottom">
          <div className="betting-overlay__hud">
            {board}

            {/*
              Zero-height footer anchors Balance / Total Bet meters
              (same absolute placement as betting portrait) — no chips.
            */}
            <footer className="betting-footer race-overlay__footer race-overlay__footer--meters-only">
              <div className="betting-footer__balance-wrap">
                <span className="betting-footer__caption">BALANCE:</span>
                <div
                  className="betting-footer__meter"
                  style={{ backgroundImage: `url(${uiAssets.balanceBar})` }}
                >
                  {formatMoney(balance)}
                </div>
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
            </footer>
          </div>
        </div>
      </div>
    )
  }

  const currentBetsToggle = (
    <button
      ref={currentBetsToggleRef}
      type="button"
      className={`race-overlay__current-bets${betsOpen ? ' is-open' : ''}`}
      style={{
        backgroundImage: `url(${
          betsOpen
            ? uiAssets.historyMyBetsActive
            : uiAssets.historyMyBetsInactive
        })`,
      }}
      aria-label="Current bets"
      aria-expanded={betsOpen}
      aria-controls="race-current-bets-dialog"
      onClick={toggleCurrentBets}
    >
      CURRENT BETS
    </button>
  )

  return (
    <div
      ref={overlayRef}
      className={`race-overlay${betsOpen ? ' is-bets-open' : ''}`}
      data-compact={compact ? 'true' : undefined}
      data-orientation={orientation}
      data-round-id={round?.id ?? undefined}
      data-round-status={status ?? undefined}
      style={{ '--hud-scale': viewportScale }}
    >
      <BettingBanner secondsLeft={elapsedLabel} />

      {compact ? <HudMenuChrome placement="top" /> : null}

      {betsOpen ? (
        <button
          type="button"
          className="race-bets-sheet__darken"
          aria-label="Close current bets"
          onClick={closeBets}
        />
      ) : null}

      {betsOpen ? <HudFade /> : null}

      <div className="betting-overlay__bottom">
        <div className="betting-overlay__hud">
          {betsOpen ? (
            <div
              id="race-current-bets-dialog"
              ref={betsDialogRef}
              className="race-bets-sheet__panel"
              role="dialog"
              aria-modal="true"
              aria-label="Current bets"
              tabIndex={-1}
            >
              {board}
            </div>
          ) : null}

          <div className="race-overlay__toggle-portal">{currentBetsToggle}</div>

          <footer className="betting-footer race-overlay__footer">
            <div className="betting-footer__balance-wrap">
              <span className="betting-footer__caption">BALANCE:</span>
              <div
                className="betting-footer__meter"
                style={{ backgroundImage: `url(${uiAssets.balanceBar})` }}
              >
                {formatMoney(balance)}
              </div>
            </div>

            <div className="race-overlay__mid">
              <span className="race-overlay__mid-spacer" aria-hidden="true" />
            </div>

            <div className="betting-footer__total-wrap">
              <span className="betting-footer__caption">POTENTIAL WIN:</span>
              <div
                className="betting-footer__meter"
                style={{ backgroundImage: `url(${uiAssets.balanceBar})` }}
              >
                {formatMoney(potentialWin)}
              </div>
            </div>
          </footer>
        </div>
      </div>

      {compact ? null : <HudMenuChrome placement="footer" />}
    </div>
  )
}
