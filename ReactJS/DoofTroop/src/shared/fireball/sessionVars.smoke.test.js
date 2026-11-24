/**
 * Run: node --test src/shared/fireball/sessionVars.smoke.test.js
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  coreBetDefaultFromVars,
  currencyRateFromVars,
  extractServerVars,
  snapToNearestFace,
} from './sessionVars.js'

describe('sessionVars', () => {
  it('extracts server_vars from nested Extra', () => {
    const vars = extractServerVars({
      Extra: { server_vars: { core_bet_default: 40 } },
    })
    assert.equal(coreBetDefaultFromVars(vars), 40)
  })

  it('reads currency rate with fallback 1', () => {
    assert.equal(currencyRateFromVars(null, 'USD'), 1)
    assert.equal(
      currencyRateFromVars({ core_currency_rates: { JPY: 100 } }, 'JPY'),
      100,
    )
    assert.equal(
      currencyRateFromVars({ core_currency_rates: { JPY: 100 } }, 'USD'),
      1,
    )
  })

  it('snaps to nearest face', () => {
    const faces = [0.2, 0.4, 1, 2, 5]
    assert.equal(snapToNearestFace(faces, 0.35), 0.4)
    assert.equal(snapToNearestFace(faces, 1.4), 1)
    assert.equal(snapToNearestFace(faces, 5), 5)
  })
})
