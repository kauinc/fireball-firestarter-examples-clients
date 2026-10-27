import { useEffect, useRef, useState } from 'react'
import {
  beginHistoryInsert,
  finishHistoryInsert,
  historyRowFromWinners,
} from '../../betting/state/historyStore.js'

const OPEN_MS = 320
const FLY_MS = 1350
const STAGGER_MS = 120
const ROW_ANIM_MS = 700

/**
 * After settlement results are ready: open History (if needed), shift rows,
 * fly podium icons into the new top row, drop the 11th row.
 *
 * @param {{
 *   enabled: boolean,
 *   roundId: string | null,
 *   winners: ReadonlyArray<{ place: string, src?: string | null }>,
 *   historyOpen: boolean,
 *   onEnsureHistoryOpen: () => void,
 *   readyForInsert: boolean,
 *   podiumRef: React.RefObject<HTMLElement | null>,
 *   historyPanelRef: React.RefObject<HTMLElement | null>,
 * }} args
 */
export function useHistoryInsertAnimation({
  enabled,
  roundId,
  winners,
  historyOpen,
  onEnsureHistoryOpen,
  readyForInsert,
  podiumRef,
  historyPanelRef,
}) {
  const [flights, setFlights] = useState([])
  const [landed, setLanded] = useState(false)
  const timersRef = useRef([])
  const rafsRef = useRef([])
  const finishedForRef = useRef('')
  const historyOpenRef = useRef(historyOpen)
  const winnersRef = useRef(winners)
  const podiumRefStable = useRef(podiumRef)
  const historyPanelRefStable = useRef(historyPanelRef)
  const onEnsureHistoryOpenRef = useRef(onEnsureHistoryOpen)

  useEffect(() => {
    historyOpenRef.current = historyOpen
  }, [historyOpen])

  useEffect(() => {
    winnersRef.current = winners
  }, [winners])

  useEffect(() => {
    podiumRefStable.current = podiumRef
  }, [podiumRef])

  useEffect(() => {
    historyPanelRefStable.current = historyPanelRef
  }, [historyPanelRef])

  useEffect(() => {
    onEnsureHistoryOpenRef.current = onEnsureHistoryOpen
  }, [onEnsureHistoryOpen])

  const winnersKey = (winners ?? [])
    .map((w) => `${w.place}:${w.src ?? ''}`)
    .join('|')

  function clearTimers() {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
    for (const id of rafsRef.current) window.cancelAnimationFrame(id)
    rafsRef.current = []
  }

  useEffect(() => {
    if (!enabled || !roundId || !readyForInsert || !winnersKey) {
      return undefined
    }

    const key = String(roundId)
    if (finishedForRef.current === key) return undefined

    let cancelled = false
    let insertingId = null
    let didFinish = false

    clearTimers()
    const prepId = window.setTimeout(() => {
      if (cancelled) return
      setFlights([])
      setLanded(false)
    }, 0)
    timersRef.current.push(prepId)

    const wasOpen = historyOpenRef.current
    onEnsureHistoryOpenRef.current?.()

    function startFlights(nextFlights) {
      if (cancelled) return
      setFlights(nextFlights)

      const maxFly =
        Math.max(0, ...nextFlights.map((f) => f.delayMs), 0) + FLY_MS

      const landId = window.setTimeout(() => {
        if (cancelled) return
        setLanded(true)
        setFlights([])
      }, maxFly)

      const doneId = window.setTimeout(() => {
        if (cancelled) return
        finishHistoryInsert()
        finishedForRef.current = key
        didFinish = true
      }, Math.max(ROW_ANIM_MS, maxFly) + 120)

      timersRef.current.push(landId, doneId)
    }

    const startId = window.setTimeout(() => {
      if (cancelled) return

      const row = historyRowFromWinners(key, winnersRef.current)
      const began = beginHistoryInsert(row)
      insertingId = row.id

      if (began.alreadyPresent && !began.exitingId) {
        setLanded(true)
        finishedForRef.current = key
        didFinish = true
        return
      }

      const measureDelay = wasOpen ? 120 : OPEN_MS
      const flyId = window.setTimeout(() => {
        if (cancelled) return

        function tryMeasure(attemptsLeft) {
          if (cancelled) return
          const nextFlights = buildHistoryFlights({
            rowId: row.id,
            winners: winnersRef.current,
            podiumEl: podiumRefStable.current?.current ?? null,
            panelEl: historyPanelRefStable.current?.current ?? null,
          })
          if (nextFlights.length > 0 || attemptsLeft <= 0) {
            startFlights(nextFlights)
            return
          }
          const rafId = window.requestAnimationFrame(() => {
            tryMeasure(attemptsLeft - 1)
          })
          rafsRef.current.push(rafId)
        }

        tryMeasure(10)
      }, measureDelay)

      timersRef.current.push(flyId)
    }, 40)

    timersRef.current.push(startId)

    return () => {
      cancelled = true
      clearTimers()
      // Interrupted (next round started, orientation change, …): keep the
      // row — a re-run sees it as already present and only refreshes icons.
      if (!didFinish && insertingId) {
        finishHistoryInsert()
      }
    }
  }, [enabled, roundId, winnersKey, readyForInsert])

  useEffect(() => {
    if (!enabled) {
      finishedForRef.current = ''
      const resetId = window.setTimeout(() => {
        setFlights([])
        setLanded(false)
      }, 0)
      return () => window.clearTimeout(resetId)
    }
    return undefined
  }, [enabled])

  return {
    historyFlights: flights,
    historyLanded: landed,
  }
}

function buildHistoryFlights({ rowId, winners, podiumEl, panelEl }) {
  if (!podiumEl || !panelEl) return []

  const flights = []
  let index = 0
  const order = ['1st', '2nd', '3rd']

  for (const place of order) {
    const winner = winners.find((w) => w.place === place)
    if (!winner?.src) continue

    const fromNode = podiumEl.querySelector(`[data-podium-icon="${place}"]`)
    const toNode = panelEl.querySelector(
      `[data-history-cell="${rowId}:${place}"]`,
    )
    if (!fromNode || !toNode) continue

    const fromRect = fromNode.getBoundingClientRect()
    const toRect = toNode.getBoundingClientRect()
    if (fromRect.width <= 0 || toRect.width <= 0) continue

    flights.push({
      id: `hist-${rowId}-${place}`,
      outcome: 'history',
      src: winner.src,
      from: {
        x: fromRect.left + fromRect.width / 2,
        y: fromRect.top + fromRect.height / 2,
      },
      to: {
        x: toRect.left + toRect.width / 2,
        y: toRect.top + toRect.height / 2,
      },
      delayMs: index * STAGGER_MS,
      durationMs: FLY_MS,
      size: Math.max(fromRect.width, 36),
    })
    index += 1
  }

  return flights
}
