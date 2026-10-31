import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanName } from '../api/social.js'

test('cleans display names and refuses long ones', () => {
  assert.equal(cleanName('  Goob \n  Master\u200b '), 'Goob Master')
  assert.equal(cleanName(''), '')
  assert.equal(cleanName('x'.repeat(33)), null)
  assert.equal(cleanName('🐌'.repeat(32)), '🐌'.repeat(32))
})

test('hides follows until Baum ships its social endpoints', async (context) => {
  process.env.BAUM_API_KEY = 'test-key'
  context.mock.method(globalThis, 'fetch', async () => ({ status: 404, json: async () => ({}) }))
  const { default: handler } = await import('../api/social.js')
  const res = { statusCode: 0, body: undefined as unknown, setHeader() {}, status(code: number) { this.statusCode = code; return this }, json(body: unknown) { this.body = body; return this } }
  await handler({ method: 'GET', query: { wallet: '0xf6414c58f65b106232871c0d566c417054ef6b92' }, headers: {} }, res)
  assert.deepEqual([res.statusCode, res.body], [503, { reason: 'not-configured' }])
  delete process.env.BAUM_API_KEY
})
