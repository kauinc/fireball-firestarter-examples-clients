import { useCallback, useEffect, useRef, useState } from 'react'
import { BettingBanner } from './BettingBanner.jsx'
import { DoofGrid } from './DoofGrid.jsx'
import { MidControls } from './MidControls.jsx'
import { BettingFooter } from './BettingFooter.jsx'
import { useCurrentRound } from '../hooks/useCurrentRound.js'
import { useBettingOverlayState } from '../hooks/useBettingOverlayState.js'
import { useChipBets } from '../hooks/useChipBets.js'
import { useChipDrag } from '../hooks/useChipDrag.js'
import { useBalance } from '../state/balanceStore.js'
import { getCarryForwardBets } from '../state/carryForwardBetsStore.js'
import { getLastRoundBets } from '../state/lastRoundBetsStore.js'
import { uiAssets } from '../assets/uiAssets.js'
import {
  canPlaceBetTarget,
  emptyCrazyComboPicks,
  isCrazyComboDoofTaken,
  nextCrazyComboSlot,
  requiresComboPickBeforeBet,
} from '../constants/combo.js'
import { BettingPhase } from '../constants/bettingPhase.js'
import {
  CHIP_VALUES,
  DEFAULT_CHIP_VALUE,
  MAX_BET_PER_TARGET,
  largestChipAtMost,
} from '../constants/doofs.js'
import { betTargetKey } from '../utils/betTargets.js'
import { roundMoney, stackTotal } from '../utils/chipMath.js'
import {
  HudFade,
  HudMenuChrome,
  getDoofColorBarsFadeAnchorTop,
  useHudViewportContext,
  useSyncHudFadeHeight,
} from '../../hud/index.js'
import { playSfx } from '../../../shared/audio/index.js'
import '../styles/betting.css'

const DEFAULT_SELECTED_POSITIONS = Object.freeze(['1st'])

/**
 * Round-scoped betting UI — remounts on new round via `key={sessionKey}`.
 */
function BettingRoundSession({
  sessionKey,
  phase,
  secondsLeft,
  bannerLabel,
  timerVariant,
  disabled,
  compact,
  viewportScale,
  orientation = 'landscape',
  portraitVideoPx = 0,
  round,
  status,
  hidden = false,
  boardHidden = false,
  historyOpen,
  onHistoryOpenChange,
  selectedChip,
  onSelectedChipChange,
}) {
  const isPortrait = orientation === 'portrait'
  const balance = useBalance()
  const boardRef = useRef(null)
  const overlayRef = useRef(null)
  const [accessory, setAccessory] = useState(null)
  const [selectedMetal, setSelectedMetal] = useState('gold')
  const [comboActive, setComboActive] = useState(false)

  // Read carry-forward once (consumed); Strict Mode remount reuses seeded cache.
  const [carry] = useState(() => getCarryForwardBets(sessionKey))

  const [comboPick, setComboPick] = useState(() => carry?.comboPick ?? null)
  const [crazyComboPickActive, setCrazyComboPickActive] = useState(false)
  const [crazyComboActiveSlot, setCrazyComboActiveSlot] = useState(null)
  const [crazyComboPicks, setCrazyComboPicks] = useState(() =>
    carry?.crazyComboPicks
      ? { ...carry.crazyComboPicks }
      : emptyCrazyComboPicks(),
  )

  const crazyCombo = true

  const handleCarryForwardRejected = useCallback(() => {
    setComboPick(null)
    setCrazyComboPicks(emptyCrazyComboPicks())
    setComboActive(false)
    setCrazyComboPickActive(false)
    setCrazyComboActiveSlot(null)
  }, [])

  const handleUndoMeta = useCallback((meta) => {
    setComboActive(false)
    setCrazyComboPickActive(false)
    setCrazyComboActiveSlot(null)
    setComboPick(meta?.comboPick ?? null)
    setCrazyComboPicks(
      meta?.crazyComboPicks
        ? { ...meta.crazyComboPicks }
        : emptyCrazyComboPicks(),
    )
  }, [])

  useEffect(() => {
    if (hidden) return
    if (phase === BettingPhase.OPEN) playSfx('bettingOpen')
    else if (phase === BettingPhase.CLOSING) playSfx('bettingClosing')
    else if (phase === BettingPhase.CLOSED) playSfx('bettingClosed')
  }, [phase, hidden])

  function handleComboToggle() {
    setCrazyComboPickActive(false)
    setCrazyComboActiveSlot(null)
    setComboActive((active) => !active)
    playSfx('comboToggle')
  }

  function handleComboBarPick(kind, key) {
    setComboPick({ kind, key })
    setComboActive(false)
    playSfx('comboPick')
  }

  function handleCrazyComboBarClick(requestedSlot = null) {
    if (disabled || comboActive) return

    if (crazyComboPickActive) {
      if (requestedSlot && requestedSlot !== crazyComboActiveSlot) {
        setCrazyComboActiveSlot(requestedSlot)
        playSfx('crazyToggle')
        return
      }
      // PICK while already picking (no slot) cancels pick mode.
      if (!requestedSlot) {
        setCrazyComboPickActive(false)
        setCrazyComboActiveSlot(null)
        playSfx('crazyToggle')
      }
      return
    }

    const slot = requestedSlot ?? nextCrazyComboSlot(crazyComboPicks) ?? '1st'
    setCrazyComboActiveSlot(slot)
    setCrazyComboPickActive(true)
    playSfx('crazyToggle')
  }

  function handleCrazyComboDoofPick(color, pattern) {
    if (!crazyComboPickActive || !crazyComboActiveSlot) return
    if (isCrazyComboDoofTaken(crazyComboPicks, color, pattern)) {
      playSfx('betReject')
      return
    }

    const nextPicks = {
      ...crazyComboPicks,
      [crazyComboActiveSlot]: { color, pattern },
    }
    setCrazyComboPicks(nextPicks)
    playSfx('crazyPick')

    const nextSlot = nextCrazyComboSlot(nextPicks)
    if (nextSlot) {
      setCrazyComboActiveSlot(nextSlot)
      return
    }

    setCrazyComboPickActive(false)
    setCrazyComboActiveSlot(null)
    playSfx('crazyComplete')
  }

  const {
    bets,
    totalBet,
    canRepeat,
    placeBet,
    clearBets,
    clearBetsByTargetType,
    repeatLastBets,
    doubleBets,
  } = useChipBets(
    DEFAULT_SELECTED_POSITIONS,
    sessionKey,
    crazyCombo,
    comboPick,
    crazyComboPicks,
    {
      onCarryForwardRejected: handleCarryForwardRejected,
      onUndoMeta: handleUndoMeta,
    },
  )

  function handleComboClear() {
    setComboActive(false)
    // Snapshot undo (incl. pick) before clearing pick state.
    clearBetsByTargetType('combo')
    setComboPick(null)
    playSfx('betClear')
  }

  function handleCrazyComboClear() {
    setCrazyComboPickActive(false)
    setCrazyComboActiveSlot(null)
    // Snapshot undo (incl. picks) before clearing pick state.
    clearBetsByTargetType('crazyCombo')
    setCrazyComboPicks(emptyCrazyComboPicks())
    playSfx('betClear')
  }

  function tryPlaceBet(amount, target, metal = selectedMetal) {
    if (
      !canPlaceBetTarget(target, { crazyCombo, comboPick, crazyComboPicks })
    ) {
      playSfx('betReject')
      return false
    }

    // If the selected chip would push past the per-target max, place the
    // largest chip that still fits and switch the tray to that denomination.
    let placeAmount = amount
    const key = betTargetKey(target)
    const existing = bets.find((bet) => bet.key === key)
    const current = existing ? stackTotal(existing.chips) : 0
    const remaining = roundMoney(MAX_BET_PER_TARGET - current)
    if (!(remaining > 0)) {
      playSfx('betReject')
      return false
    }
    if (placeAmount > remaining) {
      const clamped = largestChipAtMost(remaining)
      if (clamped == null) {
        playSfx('betReject')
        return false
      }
      placeAmount = clamped
      if (placeAmount !== selectedChip) {
        onSelectedChipChange(placeAmount)
      }
    }

    if (!placeBet(placeAmount, target, metal)) {
      playSfx('betReject')
      return false
    }
    playSfx('chipPlace')
    return true
  }

  const { dragChip, startDrag, clearDrag, isDragPlacement } = useChipDrag({
    disabled: disabled || hidden || comboActive || crazyComboPickActive,
    placeBet: (amount, target, metal) => {
      tryPlaceBet(amount, target, metal)
    },
    boardRef,
  })

  function handleClear() {
    // CLEAR BETS clears chip stacks only — combo / crazy combo picks stay.
    clearBets()
    playSfx('betClear')
  }

  function handleRepeat() {
    if (!repeatLastBets()) {
      playSfx('betReject')
      return
    }
    // Restore combo / crazy-combo picks that belonged to last round's bets.
    const last = getLastRoundBets()
    setComboActive(false)
    setCrazyComboPickActive(false)
    setCrazyComboActiveSlot(null)
    setComboPick(last?.comboPick ?? null)
    setCrazyComboPicks(
      last?.crazyComboPicks
        ? { ...last.crazyComboPicks }
        : emptyCrazyComboPicks(),
    )
    playSfx('betDouble')
  }

  function handleDouble() {
    if (!doubleBets()) {
      playSfx('betReject')
      return
    }
    playSfx('betDouble')
  }

  function playChipSelectSfx(metal = selectedMetal) {
    if (metal === 'gold') playSfx('chipSelectGold')
    else if (metal === 'silver') playSfx('chipSelectSilver')
    else if (metal === 'bronze') playSfx('chipSelectBronze')
    else playSfx('chipSelect')
  }

  function handleSelectChip(value) {
    onSelectedChipChange(value)
    playChipSelectSfx()
  }

  function handleSelectMetal(metal) {
    setSelectedMetal(metal)
    playChipSelectSfx(metal)
  }

  function stepSelectedChip(delta) {
    const index = CHIP_VALUES.indexOf(selectedChip)
    const from = index >= 0 ? index : 0
    const next = CHIP_VALUES[from + delta]
    if (next == null) {
      playSfx('betReject')
      return
    }
    handleSelectChip(next)
  }

  // Round-scoped betting state remounts via parent `key={sessionKey}`.
  // History + selected chip live in BettingOverlay and persist across rounds.

  const showAdvancedChrome = !boardHidden
  const getFadeAnchorTop = useCallback(
    () => getDoofColorBarsFadeAnchorTop(overlayRef.current),
    [],
  )
  useSyncHudFadeHeight({
    // Portrait uses CSS height (stream overlap); landscape syncs to color bars.
    enabled: showAdvancedChrome && !hidden && !isPortrait,
    overlayRef,
    getAnchorTop: getFadeAnchorTop,
    deps: [viewportScale, compact, showAdvancedChrome, isPortrait],
  })

  if (hidden) return null

  const comboPickRequired = requiresComboPickBeforeBet(crazyCombo, comboPick)
  const boardBettingDisabled = disabled

  function handlePlaceBet(target) {
    if (isDragPlacement()) return
    clearDrag()
    if (disabled || comboActive || crazyComboPickActive || !target) {
      return
    }
    tryPlaceBet(selectedChip, target, selectedMetal)
  }

  const labelBets = bets.filter(
    (bet) => bet.target.type === 'color' || bet.target.type === 'pattern',
  )
  const accessoryBets = bets.filter((bet) => bet.target.type === 'accessory')
  const comboBet =
    bets.find((bet) => bet.target.type === 'combo') ?? null
  const crazyComboBet =
    bets.find((bet) => bet.target.type === 'crazyCombo') ?? null
  const ghostSrc =
    dragChip?.moved && dragChip?.metal
      ? (uiAssets.chipsSimple?.[dragChip.metal] ?? uiAssets.chips[dragChip.metal])
      : null

  return (
    <div
      ref={overlayRef}
      className="betting-overlay"
      data-phase={phase}
      data-timer-variant={timerVariant}
      data-compact={compact ? 'true' : undefined}
      data-orientation={orientation}
      data-advanced={showAdvancedChrome ? 'true' : 'false'}
      data-banner-only={boardHidden ? 'true' : undefined}
      data-crazy={crazyCombo ? 'true' : 'false'}
      data-combo={comboActive ? 'true' : 'false'}
      data-crazy-combo-pick={crazyComboPickActive ? 'true' : 'false'}
      data-combo-pick-required={comboPickRequired ? 'true' : 'false'}
      data-round-id={round?.id ?? undefined}
      data-round-number={round?.round_number ?? undefined}
      data-round-status={status ?? undefined}
      style={{
        '--hud-scale': viewportScale,
        ...(isPortrait && portraitVideoPx > 0
          ? { '--portrait-video-h': `${portraitVideoPx}px` }
          : null),
      }}
    >
      <BettingBanner
        label={bannerLabel}
        secondsLeft={secondsLeft}
        variant={timerVariant}
      />

      {boardHidden ? null : (
        <>
          {compact || isPortrait ? <HudMenuChrome placement="top" /> : null}

          {/* Portrait: always paint Background_Fade over lower half of stream. */}
          {showAdvancedChrome || isPortrait ? <HudFade /> : null}

          <div className="betting-overlay__bottom">
            <div className="betting-overlay__hud" ref={boardRef}>
              <DoofGrid
                disabled={boardBettingDisabled}
                bets={bets}
                labelBets={labelBets}
                onPlaceBet={handlePlaceBet}
                comboActive={comboActive}
                comboPick={comboPick}
                crazyComboPickActive={crazyComboPickActive}
                crazyComboActiveSlot={crazyComboActiveSlot}
                crazyComboPicks={crazyComboPicks}
                onCrazyComboDoofPick={handleCrazyComboDoofPick}
                onComboBarPick={handleComboBarPick}
                highlightTarget={
                  dragChip?.moved ? dragChip.hoverTarget : null
                }
                portrait={isPortrait}
                balance={null}
                totalBet={null}
                onClear={handleClear}
                canClear={totalBet > 0}
              />

              {showAdvancedChrome ? (
                <MidControls
                  accessory={accessory}
                  onAccessoryChange={setAccessory}
                  disabled={disabled}
                  bets={accessoryBets}
                  onPlaceBet={handlePlaceBet}
                  historyOpen={isPortrait ? false : historyOpen}
                  onHistoryOpenChange={isPortrait ? undefined : onHistoryOpenChange}
                  comboActive={comboActive}
                  onComboBarPick={handleComboBarPick}
                  onComboToggle={handleComboToggle}
                  onComboClear={handleComboClear}
                  comboPick={comboPick}
                  comboBet={comboBet}
                  crazyComboBet={crazyComboBet}
                  onPlaceComboBet={handlePlaceBet}
                  crazyComboPickActive={crazyComboPickActive}
                  crazyComboActiveSlot={crazyComboActiveSlot}
                  crazyComboPicks={crazyComboPicks}
                  onCrazyComboBarClick={handleCrazyComboBarClick}
                  onCrazyComboClear={handleCrazyComboClear}
                  comboPickRequired={comboPickRequired}
                />
              ) : null}

              <BettingFooter
                disabled={disabled}
                stakeValue={selectedChip}
                selectedMetal={selectedMetal}
                onSelectMetal={handleSelectMetal}
                onChipDragStart={startDrag}
                onRepeat={handleRepeat}
                onDouble={handleDouble}
                onIncreaseChip={() => stepSelectedChip(1)}
                onDecreaseChip={() => stepSelectedChip(-1)}
                canRepeat={canRepeat}
                canDouble={totalBet > 0}
                balance={balance}
                totalBet={totalBet}
                hideMenu
              />
            </div>
          </div>

          {compact ? null : <HudMenuChrome placement="footer" />}

          {ghostSrc ? (
            <div
              className="betting-chip-ghost"
              style={{
                left: dragChip.x,
                top: dragChip.y,
                backgroundImage: `url(${ghostSrc})`,
              }}
              aria-hidden="true"
            >
              <span>{dragChip.value}</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

/**
 * Betting HUD driven by Supabase `rounds.status` (Realtime).
 * Full board while ROUND_CREATED / BETTING_OPEN; TimerBar through BETTING_CLOSED / TRACK_READY.
 *
 * Mobile (compact): landscape layout matches product refs.
 * Combo controls are always visible during betting.
 */
export function BettingOverlay() {
  const {
    scale: viewportScale,
    compact,
    orientation,
    portraitVideoPx,
  } = useHudViewportContext()
  const { round, status } = useCurrentRound()
  const {
    phase,
    secondsLeft,
    bannerLabel,
    timerVariant,
    isBannerVisible,
    isBoardVisible,
    disabled,
  } = useBettingOverlayState({ status, round })
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedChip, setSelectedChip] = useState(DEFAULT_CHIP_VALUE)

  // Keep bets for the whole round (race HUD reads the same placements).
  const sessionKey = round?.id ? String(round.id) : 'no-round'

  return (
    <BettingRoundSession
      key={sessionKey}
      sessionKey={sessionKey}
      phase={phase}
      secondsLeft={secondsLeft}
      bannerLabel={bannerLabel}
      timerVariant={timerVariant}
      disabled={disabled}
      compact={compact}
      viewportScale={viewportScale}
      orientation={orientation}
      portraitVideoPx={portraitVideoPx}
      round={round}
      status={status}
      hidden={!isBannerVisible}
      boardHidden={!isBoardVisible}
      historyOpen={historyOpen}
      onHistoryOpenChange={setHistoryOpen}
      selectedChip={selectedChip}
      onSelectedChipChange={setSelectedChip}
    />
  )
}
