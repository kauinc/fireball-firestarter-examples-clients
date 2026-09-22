import { useRef } from 'react'
import { DOOF_COLORS, DOOF_PATTERNS } from '../constants/doofs.js'
import { getDoofBoardCell } from '../assets/doofImages.js'
import {
  getHighlightedDoofUrl,
  isCellHighlightedByTarget,
} from '../assets/highlightedDoofs.js'
import { uiAssets } from '../assets/uiAssets.js'
import { ChipStack } from './ChipStack.jsx'
import {
  colorTarget,
  fieldChipStyle,
  patternTarget,
  resolveFieldTarget,
} from '../utils/betTargets.js'
import { getComboBarState, comboPickBarBackground } from '../utils/comboBars.js'
import { isCrazyComboDoofTaken } from '../constants/combo.js'
import { formatMoney } from '../utils/formatMoney.js'

function ChipLabel({
  children,
  onPlace,
  disabled,
  betDrop,
  comboActive = false,
  comboHighlight = false,
  onComboPick,
}) {
  const highlighted = comboActive && comboHighlight
  const barAsset = highlighted ? comboPickBarBackground() : uiAssets.textBar

  function handleActivate() {
    if (disabled) return
    if (comboActive && comboHighlight) {
      onComboPick?.()
      return
    }
    onPlace?.()
  }

  return (
    <button
      type="button"
      className={`doof-grid__chip-label${comboActive && comboHighlight ? ' is-combo-highlight' : ''}`}
      style={{ '--chip-bar': `url(${barAsset})` }}
      disabled={disabled}
      data-bet-drop={comboActive ? undefined : betDrop ? JSON.stringify(betDrop) : undefined}
      onPointerUp={(event) => {
        if (disabled || event.button !== 0) return
        handleActivate()
      }}
      onClick={(event) => {
        if (disabled || event.detail !== 0) return
        handleActivate()
      }}
    >
      <span>{children}</span>
    </button>
  )
}

function renderCell({
  color,
  pattern,
  disabled,
  crazyComboPickActive,
  crazyComboActiveSlot,
  crazyComboPicks,
  highlightTarget,
  onCrazyComboDoofPick,
}) {
  const cell = getDoofBoardCell(color, pattern)
  const accessoryClass =
    cell?.accessory === 'Hats' ? 'is-hat' : 'is-glasses'
  const alreadyTaken =
    crazyComboPickActive &&
    isCrazyComboDoofTaken(crazyComboPicks, color, pattern)
  const pickable =
    crazyComboPickActive && crazyComboActiveSlot && !alreadyTaken
  const dragHighlight =
    !crazyComboPickActive &&
    isCellHighlightedByTarget(highlightTarget, color, pattern)
  const highlightSrc = dragHighlight
    ? getHighlightedDoofUrl(color, pattern)
    : null
  const cellClass = [
    'doof-grid__cell',
    accessoryClass,
    pickable ? 'is-crazy-combo-pickable' : '',
    alreadyTaken ? 'is-crazy-combo-taken' : '',
    dragHighlight ? 'is-drag-highlight' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      key={`${color}-${pattern}`}
      className={cellClass}
      aria-label={`${color} ${pattern}`}
      aria-disabled={alreadyTaken || undefined}
      onPointerUp={(event) => {
        if (!pickable || disabled || event.button !== 0) return
        event.stopPropagation()
        onCrazyComboDoofPick?.(color, pattern)
      }}
    >
      {cell ? (
        <span
          className={`doof-grid__sprite${highlightSrc ? ' is-highlighted' : ''}`}
        >
          {highlightSrc ? (
            <img
              className="doof-grid__sprite-glow"
              src={highlightSrc}
              alt=""
              draggable={false}
              aria-hidden="true"
            />
          ) : null}
          <img
            className="doof-grid__sprite-base"
            src={cell.src}
            alt=""
            draggable={false}
          />
        </span>
      ) : (
        <span className="doof-grid__missing">?</span>
      )}
    </div>
  )
}

/**
 * Color × pattern board with roulette-style chip drop targets.
 * Landscape: 6×3 (colors × patterns). Portrait: transposed 3×6.
 */
export function DoofGrid({
  disabled = false,
  bets = [],
  onPlaceBet,
  labelBets = [],
  settleByBetId = null,
  hideSettledChips = false,
  comboActive = false,
  onComboBarPick,
  crazyComboPickActive = false,
  crazyComboActiveSlot = null,
  crazyComboPicks = {},
  onCrazyComboDoofPick,
  /** Drop-target preview while dragging a chip from the tray. */
  highlightTarget = null,
  portrait = false,
  balance = null,
  totalBet = null,
}) {
  const playableRef = useRef(null)
  const fieldSrc = crazyComboPickActive ? uiAssets.ccBoard : uiAssets.betField

  const fieldBets = bets.filter(
    (bet) => bet.target.type === 'doof' || bet.target.type === 'split',
  )

  function settleClass(betId) {
    const outcome = settleByBetId?.[betId]
    if (!outcome) return ''
    const hidden = hideSettledChips ? ' is-settle-gone' : ''
    return ` is-settle-${outcome}${hidden}`
  }

  function placeFromFieldPointer(clientX, clientY) {
    if (
      disabled ||
      comboActive ||
      crazyComboPickActive ||
      !onPlaceBet ||
      !playableRef.current
    ) {
      onPlaceBet?.(null)
      return
    }
    const rect = playableRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      onPlaceBet(null)
      return
    }

    const nx = (clientX - rect.left) / rect.width
    const ny = (clientY - rect.top) / rect.height
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) {
      onPlaceBet(null)
      return
    }

    onPlaceBet(resolveFieldTarget(nx, ny, { portrait }))
  }

  const { highlight } = getComboBarState(comboActive)

  const cells = portrait
    ? DOOF_COLORS.flatMap((color) =>
        DOOF_PATTERNS.map((pattern) =>
          renderCell({
            color,
            pattern,
            disabled,
            crazyComboPickActive,
            crazyComboActiveSlot,
            crazyComboPicks,
            highlightTarget,
            onCrazyComboDoofPick,
          }),
        ),
      )
    : DOOF_PATTERNS.flatMap((pattern) =>
        DOOF_COLORS.map((color) =>
          renderCell({
            color,
            pattern,
            disabled,
            crazyComboPickActive,
            crazyComboActiveSlot,
            crazyComboPicks,
            highlightTarget,
            onCrazyComboDoofPick,
          }),
        ),
      )

  const showSideMeters = portrait && (balance != null || totalBet != null)

  return (
    <div
      className={`doof-grid${comboActive ? ' is-combo-active' : ''}${crazyComboPickActive ? ' is-crazy-combo-active' : ''}`}
      role="group"
      aria-label="Betting board (pointer placement only in this prototype)"
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? 'true' : 'false'}
      data-portrait={portrait ? 'true' : undefined}
    >
      <div className="doof-grid__spacer" aria-hidden="true" />

      <div className="doof-grid__odds-spacer" aria-hidden="true" />

      <div className="doof-grid__patterns">
        {DOOF_PATTERNS.map((pattern) => {
          const stack = labelBets.find(
            (bet) =>
              bet.target.type === 'pattern' && bet.target.pattern === pattern,
          )
          return (
            <div key={pattern} className="doof-grid__label-slot">
              <ChipLabel
                disabled={disabled}
                betDrop={patternTarget(pattern)}
                comboActive={comboActive}
                comboHighlight={highlight}
                onComboPick={() => onComboBarPick?.('patterns', pattern)}
                onPlace={() => onPlaceBet?.(patternTarget(pattern))}
              >
                {pattern}
              </ChipLabel>
              {stack ? (
                <span
                  className={`doof-grid__label-chip${settleClass(stack.id)}`}
                  data-bet-id={stack.id}
                  onPointerUp={(event) => {
                    if (disabled || comboActive || crazyComboPickActive || event.button !== 0) return
                    event.stopPropagation()
                    onPlaceBet?.(patternTarget(pattern))
                  }}
                >
                  <ChipStack chips={stack.chips} />
                </span>
              ) : null}
            </div>
          )
        })}
      </div>

      <div
        className="doof-grid__field"
        style={
          portrait
            ? { '--field-skin': `url(${fieldSrc})` }
            : { backgroundImage: `url(${fieldSrc})` }
        }
        onPointerUp={(event) => {
          if (event.button !== 0) return
          placeFromFieldPointer(event.clientX, event.clientY)
        }}
      >
        {portrait ? (
          <div className="doof-grid__field-skin" aria-hidden="true" />
        ) : null}
        <div ref={playableRef} className="doof-grid__playable">
          {cells}

          <div className="doof-grid__chip-layer">
            {fieldBets.map((bet) => {
              if (!bet.target.anchor) return null
              return (
                <span
                  key={bet.id}
                  className={`doof-grid__chip-anchor${settleClass(bet.id)}`}
                  data-bet-id={bet.id}
                  style={fieldChipStyle(bet.target.anchor, { portrait })}
                  onPointerUp={(event) => {
                    if (disabled || comboActive || crazyComboPickActive || event.button !== 0) return
                    event.stopPropagation()
                    placeFromFieldPointer(event.clientX, event.clientY)
                  }}
                >
                  <ChipStack chips={bet.chips} />
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <div className="doof-grid__rail">
        <div className="doof-grid__colors">
          {DOOF_COLORS.map((color) => {
            const stack = labelBets.find(
              (bet) => bet.target.type === 'color' && bet.target.color === color,
            )
            return (
              <div key={color} className="doof-grid__label-slot">
                <ChipLabel
                  disabled={disabled}
                  betDrop={colorTarget(color)}
                  comboActive={comboActive}
                  comboHighlight={highlight}
                  onComboPick={() => onComboBarPick?.('colors', color)}
                  onPlace={() => onPlaceBet?.(colorTarget(color))}
                >
                  {color}
                </ChipLabel>
                {stack ? (
                  <span
                    className={`doof-grid__label-chip${settleClass(stack.id)}`}
                    data-bet-id={stack.id}
                    onPointerUp={(event) => {
                      if (disabled || comboActive || crazyComboPickActive || event.button !== 0) return
                      event.stopPropagation()
                      onPlaceBet?.(colorTarget(color))
                    }}
                  >
                    <ChipStack chips={stack.chips} />
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="doof-grid__odds">
          <div className="doof-grid__odds-item">
            <span className="doof-grid__odds-label">MAX</span>
            <span className="doof-grid__odds-value">x1.5</span>
          </div>
          <div className="doof-grid__odds-item">
            <span className="doof-grid__odds-label">MIN</span>
            <span className="doof-grid__odds-value">x15.5</span>
          </div>
        </div>

        {showSideMeters ? (
          <div className="doof-grid__side-meters">
            {balance != null ? (
              <div className="doof-grid__meter">
                <span className="doof-grid__meter-caption">BALANCE:</span>
                <div
                  className="doof-grid__meter-bar"
                  style={{ backgroundImage: `url(${uiAssets.balanceBar})` }}
                >
                  {formatMoney(balance)}
                </div>
              </div>
            ) : null}
            {totalBet != null ? (
              <div className="doof-grid__meter">
                <span className="doof-grid__meter-caption">TOTAL BET:</span>
                <div
                  className="doof-grid__meter-bar"
                  style={{ backgroundImage: `url(${uiAssets.balanceBar})` }}
                >
                  {formatMoney(totalBet)}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
