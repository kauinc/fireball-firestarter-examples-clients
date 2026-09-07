import { useEffect, useRef, useState } from 'react'
import { resolveDropAtPoint } from '../utils/betTargets.js'

const MOVE_THRESHOLD_PX_SQ = 36

/**
 * Chip drag from the footer tray onto board / labels / accessories.
 * Touch: pointerup stays on the chip button — drop resolves via coords.
 *
 * @param {{
 *   disabled: boolean,
 *   placeBet: (amount: number, target: Record<string, unknown>, metal: string) => void,
 *   boardRef?: React.RefObject<HTMLElement | null>,
 * }} args
 */
export function useChipDrag({ disabled, placeBet, boardRef = null }) {
  const [dragChip, setDragChip] = useState(null)
  const dragRef = useRef(null)
  const disabledRef = useRef(disabled)
  const placeBetRef = useRef(placeBet)
  const boardRefInternal = useRef(boardRef)

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  useEffect(() => {
    placeBetRef.current = placeBet
  }, [placeBet])

  useEffect(() => {
    boardRefInternal.current = boardRef
  }, [boardRef])

  useEffect(() => {
    dragRef.current = dragChip
  }, [dragChip])

  const isDragging = Boolean(dragChip)

  useEffect(() => {
    if (!isDragging) return undefined

    function onMove(event) {
      const prev = dragRef.current
      if (!prev) return

      const dx = event.clientX - prev.originX
      const dy = event.clientY - prev.originY
      const moved =
        prev.moved || dx * dx + dy * dy > MOVE_THRESHOLD_PX_SQ

      const root = boardRefInternal.current?.current ?? null
      const hoverTarget = moved
        ? resolveDropAtPoint(event.clientX, event.clientY, root)
        : null

      setDragChip({
        ...prev,
        moved,
        x: event.clientX,
        y: event.clientY,
        hoverTarget,
      })
    }

    function onUp(event) {
      const chip = dragRef.current
      if (chip?.moved && !disabledRef.current) {
        const root = boardRefInternal.current?.current ?? null
        const target = resolveDropAtPoint(
          event.clientX,
          event.clientY,
          root,
        )
        if (target) placeBetRef.current(chip.value, target, chip.metal)
      }
      setDragChip(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [isDragging])

  function startDrag(event, value, metal) {
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* Pointer capture optional */
    }
    setDragChip({
      value,
      metal,
      moved: false,
      originX: event.clientX,
      originY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      hoverTarget: null,
    })
  }

  function clearDrag() {
    setDragChip(null)
  }

  /** True while a chip drag is in progress (moved past threshold). */
  function isDragPlacement() {
    return Boolean(dragRef.current?.moved)
  }

  return {
    dragChip,
    startDrag,
    clearDrag,
    isDragPlacement,
  }
}
