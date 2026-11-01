import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hasSeenWelcome, markWelcomeSeen, previewsNewUserCards, welcomeKey } from '../src/lib/welcome.ts'

const profile = (username: string | null, wallets: string[] = []) => ({ username, wallets, strategy: null, copy: null })

test('keys the welcome tour to the Baum account, falling back to its default wallet', () => {
  assert.equal(welcomeKey(profile('Goobz', ['0xABC']), null), 'slugs.welcomed:goobz')
  assert.equal(welcomeKey(profile(null, ['0xABC', '0xdef']), null), 'slugs.welcomed:0xabc')
  assert.equal(welcomeKey(profile(null), null), null)
})

test('keys a guest to their invite, and nobody to nothing', () => {
  assert.equal(welcomeKey(null, { code: 'SLUGS-A3X7', from: null, expiresAt: 0 }), 'slugs.welcomed:guest:slugs-a3x7')
  assert.equal(welcomeKey(null, null), null)
})

test('remembers the tour for the visit even where storage is unavailable', () => {
  const key = 'slugs.welcomed:test-visit'
  assert.equal(hasSeenWelcome(key), false)
  markWelcomeSeen(key)
  assert.equal(hasSeenWelcome(key), true)
})

test('the preview account sees the new-user cards on every visit', () => {
  const key = welcomeKey(profile('goobz', ['0xabc']), null)!
  try { localStorage.setItem(key, '1') } catch { /* no storage in this runtime */ }
  assert.equal(hasSeenWelcome(key), false)
  markWelcomeSeen(key)
  assert.equal(hasSeenWelcome(key), true) // closed for the rest of this visit
  assert.equal(previewsNewUserCards(profile('GooBZ')), true)
  assert.equal(previewsNewUserCards(profile('someone')), false)
  assert.equal(previewsNewUserCards(null), false)
})
