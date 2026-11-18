import { sendGameRequest } from './client.js'
import { applyCfError, setCfBusy } from './cfGameStore.js'
import { applySendResult } from './applyServerMessage.js'
import { CfMessages } from './messages.js'
import { serializeBet, serializeTarget } from './normalize.js'

/**
 * @param {string} name
 * @param {Record<string, unknown>} [fields]
 */
async function request(name, fields = {}) {
  setCfBusy(true)
  try {
    const result = await sendGameRequest(name, fields)
    applySendResult(result)
    return { ok: true, result }
  } catch (err) {
    applyCfError(err)
    applySendResult(err)
    return { ok: false, error: err }
  } finally {
    setCfBusy(false)
  }
}

export function cfPlaceChip({ roundId, target, metal, chipValue, positions }) {
  return request(CfMessages.PlaceChip, {
    RoundId: String(roundId),
    Target: serializeTarget(target),
    Metal: metal,
    ChipValue: chipValue,
    Positions: positions ?? undefined,
  })
}

export function cfRemoveChip({ roundId, betId, metal }) {
  return request(CfMessages.RemoveChip, {
    RoundId: String(roundId),
    BetId: betId,
    Metal: metal ?? undefined,
  })
}

export function cfClearBets(roundId) {
  return request(CfMessages.ClearBets, { RoundId: String(roundId) })
}

export function cfDoubleBets(roundId) {
  return request(CfMessages.DoubleBets, { RoundId: String(roundId) })
}

export function cfRepeatLast(roundId) {
  return request(CfMessages.RepeatLast, { RoundId: String(roundId) })
}

export function cfUndoBets(roundId) {
  return request(CfMessages.UndoBets, { RoundId: String(roundId) })
}

export function cfSetComboPick(roundId, comboPick) {
  return request(CfMessages.SetComboPick, {
    RoundId: String(roundId),
    ComboPick: comboPick
      ? { Kind: comboPick.kind, Key: comboPick.key }
      : null,
  })
}

export function cfSetCrazyComboPicks(roundId, crazyComboPicks) {
  /** @type {Record<string, { Color: string, Pattern: string } | null>} */
  const payload = {}
  if (crazyComboPicks && typeof crazyComboPicks === 'object') {
    for (const [place, slot] of Object.entries(crazyComboPicks)) {
      payload[place] = slot
        ? { Color: slot.color, Pattern: slot.pattern }
        : null
    }
  }
  return request(CfMessages.SetCrazyComboPicks, {
    RoundId: String(roundId),
    CrazyComboPicks: payload,
  })
}

export function cfCarryForward({
  roundId,
  bets,
  comboPick,
  crazyComboPicks,
}) {
  /** @type {Record<string, { Color: string, Pattern: string } | null> | undefined} */
  let crazyPayload
  if (crazyComboPicks && typeof crazyComboPicks === 'object') {
    crazyPayload = {}
    for (const [place, slot] of Object.entries(crazyComboPicks)) {
      crazyPayload[place] = slot
        ? { Color: slot.color, Pattern: slot.pattern }
        : null
    }
  }
  return request(CfMessages.CarryForward, {
    RoundId: String(roundId),
    Bets: (bets ?? []).map(serializeBet),
    ComboPick: comboPick
      ? { Kind: comboPick.kind, Key: comboPick.key }
      : undefined,
    CrazyComboPicks: crazyPayload,
  })
}

export function cfLockBets(roundId) {
  return request(CfMessages.LockBets, { RoundId: String(roundId) })
}

export function cfSettleRound(roundId, claimedPlacements) {
  return request(CfMessages.SettleRound, {
    RoundId: String(roundId),
    ClaimedPlacements: claimedPlacements ?? undefined,
  })
}

export function cfCancelRound(roundId) {
  return request(CfMessages.CancelRound, { RoundId: String(roundId) })
}
