/**
 * DoofTroop ↔ operator Game Client Interface (GCI) bridge.
 * Mirrors Unity GameClientInterfaceService with race-specific bet semantics.
 */

import { setAudioMuted, isAudioMuted } from '../audio/index.js'
import { getBalance, setBalance } from '../../features/betting/state/balanceStore.js'
import {
  balanceFromRgs,
  balanceToRgs,
  getDoofFireball,
} from './client.js'
import { usesCfWallet } from './gameMode.js'
import { applyHowToPlayVisibility } from './howToPlayStore.js'
import { setGamePaused } from './pauseStore.js'
import { selectNearestChip } from './selectedChipStore.js'

const BET_UPDATE_THROTTLE_MS = 100

/** @type {ReturnType<typeof setTimeout> | null} */
let betUpdateTimer = null
let attached = false

/**
 * @param {(gci: import('fireball-fireworks-sdk-client').FireballGCI) => void} fn
 */
function withGci(fn) {
  try {
    const gci = getDoofFireball().gci
    if (!gci) return
    fn(gci)
  } catch {
    // GCI is best-effort outside operator shell
  }
}

/**
 * @param {number} [hudBalance]
 */
export function gciNotifyBalance(hudBalance = getBalance()) {
  withGci((gci) => gci.sendBalanceUpdated(balanceToRgs(hudBalance)))
}

/**
 * @param {number} stakeHud
 */
export function gciNotifyBetPlaced(stakeHud) {
  withGci((gci) => gci.sendBetPlaced(balanceToRgs(stakeHud)))
}

/**
 * @param {number} winHud
 */
export function gciNotifyBetResult(winHud) {
  withGci((gci) => gci.sendBetResult(balanceToRgs(winHud)))
}

/**
 * Throttled pending-stake update (place/remove/clear/double/…).
 * @param {number} pendingStakeHud
 */
export function gciNotifyBetUpdate(pendingStakeHud) {
  if (betUpdateTimer != null) clearTimeout(betUpdateTimer)
  betUpdateTimer = setTimeout(() => {
    betUpdateTimer = null
    withGci((gci) => gci.sendBetUpdate(balanceToRgs(pendingStakeHud)))
  }, BET_UPDATE_THROTTLE_MS)
}

export function gciNotifyAudioVolume() {
  withGci((gci) => gci.sendAudioVolume(isAudioMuted() ? 0 : 100))
}

export function gciOpenDepositMenu() {
  withGci((gci) => gci.sendOpenDepositMenu())
}

/**
 * @param {string} message
 */
export function gciNotifyError(message) {
  withGci((gci) => gci.sendErrorMessage(String(message ?? '')))
}

/**
 * Operator minor units → selected chip face (no lock / settle).
 * @param {unknown} minorValue
 */
function applyOperatorBetValue(minorValue) {
  const minor = Number(minorValue)
  if (!Number.isFinite(minor) || minor < 0) return
  selectNearestChip(balanceFromRgs(minor))
}

async function refreshBalanceFromOperator() {
  if (usesCfWallet()) {
    try {
      const fireball = getDoofFireball()
      if (fireball.isAuth) {
        const res = await fireball.getBalance()
        if (res?.Balance != null) {
          setBalance(balanceFromRgs(res.Balance))
        }
      }
    } catch {
      // keep last known HUD balance
    }
  }
  gciNotifyBalance(getBalance())
}

/**
 * Subscribe operator → game handlers once. Safe to call multiple times.
 * @returns {() => void} detach
 */
export function attachGciBridge() {
  if (attached) return detachGciBridge
  attached = true

  const fireball = getDoofFireball()
  const gci = fireball.gci

  gci.onAudioVolume = (volume) => {
    setAudioMuted(Number(volume) <= 0)
  }
  gci.onPauseGame = (pause) => {
    setGamePaused(Boolean(pause))
  }
  gci.onCloseGame = () => {
    fireball.goHomePage()
  }
  gci.onBalanceUpdated = () => {
    void refreshBalanceFromOperator()
  }
  gci.onVisibleHelp = (opt) => {
    applyHowToPlayVisibility(opt)
  }
  gci.onVisiblePaytable = (opt) => {
    applyHowToPlayVisibility(opt)
  }
  gci.onBetUpdate = (value) => {
    applyOperatorBetValue(value)
  }
  gci.onBetPlace = (value) => {
    // Race: set chip face only — lock stays on round timer.
    applyOperatorBetValue(value)
  }

  return detachGciBridge
}

export function detachGciBridge() {
  if (!attached) return
  attached = false
  if (betUpdateTimer != null) {
    clearTimeout(betUpdateTimer)
    betUpdateTimer = null
  }
  try {
    const gci = getDoofFireball().gci
    gci.onAudioVolume = null
    gci.onPauseGame = null
    gci.onCloseGame = null
    gci.onBalanceUpdated = null
    gci.onVisibleHelp = null
    gci.onVisiblePaytable = null
    gci.onBetUpdate = null
    gci.onBetPlace = null
  } catch {
    // ignore
  }
}
