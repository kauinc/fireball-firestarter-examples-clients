/** DoofTroop CF message names (mirror server Constants.Messages). */
export const CfMessages = Object.freeze({
  PlaceChip: 'place-chip',
  RemoveChip: 'remove-chip',
  ClearBets: 'clear-bets',
  DoubleBets: 'double-bets',
  RepeatLast: 'repeat-last',
  SetComboPick: 'set-combo-pick',
  SetCrazyComboPicks: 'set-crazy-combo-picks',
  CarryForward: 'carry-forward',
  UndoBets: 'undo-bets',
  LockBets: 'lock-bets',
  SettleRound: 'settle-round',
  CancelRound: 'cancel-round',

  BetsUpdated: 'bets-updated',
  BetsLocked: 'bets-locked',
  BetsRejected: 'bets-rejected',
  SettleResult: 'settle-result',
  RefundResult: 'refund-result',
})

export const WalletPhase = Object.freeze({
  Idle: 'Idle',
  Pending: 'Pending',
  Locking: 'Locking',
  Locked: 'Locked',
  Settled: 'Settled',
  Refunded: 'Refunded',
  Rejected: 'Rejected',
})
