/**
 * Local wallet reconcile is retired — CF settle-result / refund-result /
 * bets-locked own money movement. Kept as a no-op so round subscription
 * call sites do not need a wider refactor.
 *
 * @param {Record<string, unknown> | null | undefined} _round
 * @param {unknown} [_published]
 */
export function reconcileRoundWallet(_round, _published) {
  // no-op
}
