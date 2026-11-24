/**
 * Run: node --test src/features/betting/state/chipLadder.smoke.test.js
 * (from ReactJS/DoofTroop; needs node_modules for fireball-fireworks-sdk-client)
 */
import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { GameMode } from 'fireball-fireworks-sdk-client'
import { setActiveGameMode } from '../../../shared/fireball/gameMode.js'
import {
  applyChipLadderFromSession,
  getChipValues,
  getDefaultChipValue,
  getMaxBetPerTarget,
  DEFAULT_COIN_CHIPS,
  MAX_BET_PER_TARGET_COINS,
} from './chipLadderStore.js'

describe('applyChipLadderFromSession', () => {
  beforeEach(() => {
    setActiveGameMode(GameMode.fun)
  })

  it('money without vars keeps legacy defaults', () => {
    setActiveGameMode(GameMode.money)
    applyChipLadderFromSession({ currency: 'USD', gameMode: GameMode.money }, null)
    assert.equal(getMaxBetPerTarget(), 100)
    assert.ok(getChipValues().includes(0.2))
    assert.equal(getDefaultChipValue(), 0.2)
  })

  it('money scales chips, default, and max by rate', () => {
    setActiveGameMode(GameMode.money)
    applyChipLadderFromSession(
      { currency: 'JPY', gameMode: GameMode.money },
      {
        server_vars: {
          core_bet_values: [20, 40, 100],
          core_bet_default: 40,
          core_currency_rates: { JPY: 100 },
        },
      },
    )
    assert.deepEqual(getChipValues(), [20, 40, 100])
    assert.equal(getDefaultChipValue(), 40)
    assert.equal(getMaxBetPerTarget(), 10000)
  })

  it('coins ignores rates and uses coin max', () => {
    setActiveGameMode(GameMode.coins)
    applyChipLadderFromSession(
      { currency: 'COINS', gameMode: GameMode.coins },
      {
        server_vars: {
          coin_bets: [1, 5, 10],
          core_bet_default: 5,
          core_currency_rates: { COINS: 99 },
        },
      },
    )
    assert.deepEqual(getChipValues(), [1, 5, 10])
    assert.equal(getDefaultChipValue(), 5)
    assert.equal(getMaxBetPerTarget(), MAX_BET_PER_TARGET_COINS)
  })

  it('coins falls back to default ladder', () => {
    setActiveGameMode(GameMode.coins)
    applyChipLadderFromSession({ currency: 'COINS', gameMode: GameMode.coins }, {})
    assert.deepEqual([...getChipValues()], [...DEFAULT_COIN_CHIPS])
    assert.equal(getMaxBetPerTarget(), MAX_BET_PER_TARGET_COINS)
  })
})
