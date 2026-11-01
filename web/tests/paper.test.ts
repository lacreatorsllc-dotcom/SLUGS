import assert from 'node:assert/strict'
import { test } from 'node:test'
import { equityPath, inUnit, isStrategyId, pct, unavailableText, unitsOf } from '../src/lib/paper.ts'

test('percentages carry a sign and a real minus', () => {
  assert.equal(pct(3.214), '+3.21%')
  assert.equal(pct(-3.2), '−3.20%')
  assert.equal(pct(0), '0.00%')
  assert.equal(pct(5, false), '5.00%')
  assert.equal(pct(null), '—')
})

test('amounts read as dollars or coins', () => {
  assert.equal(inUnit(10234.5, 'USD'), '$10,234.50')
  assert.equal(inUnit(-12.3, 'USD', true), '−$12.30')
  assert.equal(inUnit(2.5, 'ETH'), '2.5 ETH')
  assert.equal(inUnit(0.000123456, 'BTC'), '0.0001235 BTC')
  assert.equal(inUnit(0.25, 'ETH', true), '+0.25 ETH')
  assert.equal(inUnit(null, 'ETH'), '—')
})

test('units are the priced ones, in the order Baum gave', () => {
  assert.deepEqual(unitsOf({ units: ['ETH', 'USD', 'BTC'], worth: { ETH: 3, USD: 10000, BTC: null } }), ['ETH', 'USD'])
  assert.deepEqual(unitsOf({ units: ['ETH'], worth: { ETH: null } }), ['USD'])
})

test('the equity line fills its box, oldest on the left', () => {
  const path = equityPath([
    { at: '2026-10-01T00:00:00Z', usd: 100 },
    { at: '2026-10-02T00:00:00Z', usd: 200 },
  ], 100, 50)
  assert.equal(path, 'M0.0 50.0 L100.0 0.0')
  assert.equal(equityPath([{ at: '2026-10-01T00:00:00Z', usd: 1 }], 100, 50), '')
})

test('ids and the reasons a page is not shown', () => {
  assert.equal(isStrategyId('abcD12_-'), true)
  assert.equal(isStrategyId('short'), false)
  assert.match(unavailableText('resting'), /resting/)
  assert.match(unavailableText('not-found'), /isn’t public/)
  assert.match(unavailableText(null), /Try again/)
})
