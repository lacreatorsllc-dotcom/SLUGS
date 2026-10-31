import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanName } from '../api/social.js'

test('cleans display names and refuses long ones', () => {
  assert.equal(cleanName('  Goob \n  Master​ '), 'Goob Master')
  assert.equal(cleanName(''), '')
  assert.equal(cleanName('x'.repeat(33)), null)
  assert.equal(cleanName('🐌'.repeat(32)), '🐌'.repeat(32))
})
