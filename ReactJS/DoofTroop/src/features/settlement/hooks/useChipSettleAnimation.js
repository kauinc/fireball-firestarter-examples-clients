import { useEffect, useRef, useState } from 'react'
import { uiAssets } from '../../betting/assets/uiAssets.js'

const HIGHLIGHT_MS = 900
const FLY_MS = 1400
const STAGGER_MS = 120
/** Start counting shortly after the first win chip is mid-flight. */
const COUNT_START_OFFSET_MS = Math.round(FLY_MS * 0.4)
/** TOTAL WIN count-up — keep in sync with `settleCountUp` SFX (~Bar_Filling). */
const COUNT_MS = 3200

/**
 * Roulette-style chip settle: highlight → fly → smooth TOTAL WIN count-up.
 *
 * @param {{
 *   enabled: boolean,
 *   bets: ReadonlyArray<object>,
 *   outcomes: { byId: Record<string, { won: boolean, payout: number }>, didWin?: boolean } | null,
 *   totalWin: number,
 *   boardRef: React.RefObject<HTMLElement | null>,
 *   winBarRef: React.RefObject<HTMLElement | null>,
 * }} args
 */
export function useChipSettleAnimation({
  enabled,
  bets,
  outcomes,
  totalWin,
  boardRef,
  winBarRef,
}) {
  const [phase, setPhase] = useState('idle')
  const [flights, setFlights] = useState([])
  const [displayedWin, setDisplayedWin] = useState(0)
  const runKeyRef = useRef('')
  const timersRef = useRef([])
  const rafRef = useRef(0)
  const betsRef = useRef(bets)
  const outcomesRef = useRef(outcomes)
  const boardRefStable = useRef(boardRef)
  const winBarRefStable = useRef(winBarRef)

  useEffect(() => {
    betsRef.current = bets
  }, [bets])

  useEffect(() => {
    outcomesRef.current = outcomes
  }, [outcomes])

  useEffect(() => {
    boardRefStable.current = boardRef
  }, [boardRef])

  useEffect(() => {
    winBarRefStable.current = winBarRef
  }, [winBarRef])

  function clearTimers() {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }

  const betsKey = (bets ?? []).map((b) => b.id).join(',')
  const outcomesKey = outcomes
    ? Object.keys(outcomes.byId ?? {})
        .sort()
        .map((id) => {
          const row = outcomes.byId[id]
          return `${id}:${row?.won ? 1 : 0}:${row?.payout ?? 0}`
        })
        .join('|')
    : ''

  useEffect(() => {
    clearTimers()

    if (!enabled || !outcomesKey || !betsKey) {
      const resetId = window.setTimeout(() => {
        setPhase('idle')
        setFlights([])
        setDisplayedWin(0)
      }, 0)
      timersRef.current.push(resetId)
      return () => clearTimers()
    }

    const key = `${betsKey}:${outcomesKey}:${totalWin}`
    runKeyRef.current = key
    const prepId = window.setTimeout(() => {
      if (runKeyRef.current !== key) return
      setFlights([])
      setDisplayedWin(0)
    }, 0)
    timersRef.current.push(prepId)

    const startId = window.setTimeout(() => {
      if (runKeyRef.current !== key) return
      setPhase('highlight')

      const flyId = window.setTimeout(() => {
        if (runKeyRef.current !== key) return
        const nextFlights = buildFlights({
          bets: betsRef.current,
          outcomes: outcomesRef.current,
          boardEl: boardRefStable.current?.current ?? null,
          winBarEl: winBarRefStable.current?.current ?? null,
        })
        setFlights(nextFlights)
        setPhase('fly')

        const maxDelay = nextFlights.reduce(
          (max, f) => Math.max(max, f.delayMs),
          0,
        )
        const hasWins = totalWin > 0

        if (hasWins) {
          const countId = window.setTimeout(() => {
            if (runKeyRef.current !== key) return
            setPhase('count')
            animateCountUp({
              to: totalWin,
              durationMs: COUNT_MS,
              runKey: key,
              runKeyRef,
              rafRef,
              onFrame: setDisplayedWin,
              onDone: () => {
                if (runKeyRef.current !== key) return
                setDisplayedWin(totalWin)
              },
            })
          }, COUNT_START_OFFSET_MS)
          timersRef.current.push(countId)
        }

        const doneId = window.setTimeout(
          () => {
            if (runKeyRef.current !== key) return
            setDisplayedWin(totalWin)
            setPhase('done')
            setFlights([])
          },
          Math.max(
            maxDelay + FLY_MS,
            hasWins ? COUNT_START_OFFSET_MS + COUNT_MS : 0,
          ) + 120,
        )
        timersRef.current.push(doneId)
      }, HIGHLIGHT_MS)
      timersRef.current.push(flyId)
    }, 80)
    timersRef.current.push(startId)

    return () => {
      clearTimers()
    }
  }, [enabled, betsKey, outcomesKey, totalWin])

  const showCounted =
    phase === 'fly' || phase === 'count' || phase === 'done'

  return {
    phase,
    flights,
    displayedWin: showCounted ? displayedWin : 0,
    hideSourceChips: phase === 'fly' || phase === 'count' || phase === 'done',
  }
}

/**
 * Ease-out count from 0 → to over durationMs (rAF).
 */
function animateCountUp({
  to,
  durationMs,
  runKey,
  runKeyRef,
  rafRef,
  onFrame,
  onDone,
}) {
  if (to <= 0) {
    onFrame(0)
    onDone()
    return
  }

  const start = performance.now()

  function tick(now) {
    if (runKeyRef.current !== runKey) return
    const t = Math.min(1, (now - start) / durationMs)
    // Ease-out cubic — fast start, settles on the final amount.
    const eased = 1 - (1 - t) ** 3
    const value = Math.round(to * eased * 100) / 100
    onFrame(value)
    if (t < 1) {
      rafRef.current = window.requestAnimationFrame(tick)
    } else {
      rafRef.current = 0
      onFrame(to)
      onDone()
    }
  }

  rafRef.current = window.requestAnimationFrame(tick)
}

function buildFlights({ bets, outcomes, boardEl, winBarEl }) {
  if (!boardEl) return []

  const winRect = winBarEl?.getBoundingClientRect()
  const winTarget = winRect
    ? {
        x: winRect.left + winRect.width / 2,
        y: winRect.top + winRect.height / 2,
      }
    : {
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.42,
      }

  const flights = []
  let winIndex = 0
  let loseIndex = 0

  for (const bet of bets) {
    const result = outcomes?.byId?.[bet.id]
    if (!result) continue

    const node = boardEl.querySelector(`[data-bet-id="${bet.id}"]`)
    if (!node) continue
    const rect = node.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue

    const topChip = [...(bet.chips ?? [])].reverse()[0]
    const metal = topChip?.metal ?? 'gold'
    const src = uiAssets.chipsSimple?.[metal] ?? uiAssets.chips[metal] ?? null
    const from = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }

    if (result.won) {
      flights.push({
        id: `win-${bet.id}`,
        betId: bet.id,
        outcome: 'win',
        src,
        from,
        to: winTarget,
        payout: result.payout,
        delayMs: winIndex * STAGGER_MS,
        size: Math.max(rect.width, 28),
      })
      winIndex += 1
    } else {
      flights.push({
        id: `lose-${bet.id}`,
        betId: bet.id,
        outcome: 'lose',
        src,
        from,
        to: { x: from.x, y: from.y + Math.min(180, window.innerHeight * 0.2) },
        payout: 0,
        delayMs: loseIndex * STAGGER_MS,
        size: Math.max(rect.width, 28),
      })
      loseIndex += 1
    }
  }

  return flights
}
