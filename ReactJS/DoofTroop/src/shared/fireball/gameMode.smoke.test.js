/**
 * Lightweight smoke for mode helpers + balance conversion.
 * Run: node --test src/shared/fireball/gameMode.smoke.test.js
 * (from DoofTroop root after setting NODE_PATH / using relative imports that avoid Vite)
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeGameMode,
  setActiveGameMode,
  getGameMode,
  isFunMode,
  isCoinsMode,
  usesCfWallet,
} from './gameMode.js'

describe('gameMode helpers', () => {
  it('normalizes modes', () => {
    assert.equal(normalizeGameMode('FUN'), 'fun')
    assert.equal(normalizeGameMode('coins'), 'coins')
    assert.equal(normalizeGameMode('money'), 'money')
    assert.equal(normalizeGameMode('nope'), 'fun')
  })

  it('tracks active mode for CF vs local', () => {
    setActiveGameMode('fun')
    assert.equal(getGameMode(), 'fun')
    assert.equal(isFunMode(), true)
    assert.equal(usesCfWallet(), false)

    setActiveGameMode('coins')
    assert.equal(isCoinsMode(), true)
    assert.equal(usesCfWallet(), true)

    setActiveGameMode('money')
    assert.equal(usesCfWallet(), true)
  })
})
