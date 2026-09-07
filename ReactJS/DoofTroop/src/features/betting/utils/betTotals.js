/**
 * Aggregate stake helpers for HUD meters.
 */

/**
 * @param {ReadonlyArray<{ chips?: Array<{ value: number, metal?: string, count?: number }> }>} bets
 */
export function sumBetTotal(bets) {
  const total = (bets ?? []).reduce((sum, bet) => {
    const chips = bet.chips ?? []
    return (
      sum +
      chips.reduce(
        (chipSum, chip) => chipSum + chip.value * (chip.count ?? 1),
        0,
      )
    )
  }, 0)
  return Math.round(total * 100) / 100
}
