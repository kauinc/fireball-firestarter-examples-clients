/**
 * Deep-ish clone of a chip bet for undo / carry-forward / repeat archives.
 * @param {Record<string, unknown>} bet
 */
export function cloneBet(bet) {
  return {
    ...bet,
    chips: (bet.chips ?? []).map((chip) => ({ ...chip })),
    positions: [...(bet.positions ?? [])],
    target: bet.target ? { ...bet.target } : bet.target,
  }
}

/**
 * @param {ReadonlyArray<Record<string, unknown>> | null | undefined} bets
 */
export function cloneBets(bets) {
  return (bets ?? []).map(cloneBet)
}
