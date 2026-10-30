import assert from 'node:assert/strict'
import { test } from 'node:test'
import handler from '../api/data.js'

function response() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this },
    setHeader(key: string, value: string) { this.headers[key] = value },
    json(body: unknown) { this.body = body; return this },
    send(body: unknown) { this.body = body; return this },
  }
}

test('serves successful data with the required 30-minute CDN cache', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => '{"rows":[]}' }))
  const res = response()
  await handler({ query: { file: 'token' } }, res)
  assert.equal(res.statusCode, 200)
  assert.match(res.headers['cache-control'], /s-maxage=1800(?:,|$)/)
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  assert.equal(res.body, '{"rows":[]}')
})

test('unknown files are rejected without making an upstream request', async (context) => {
  const mock = context.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not fetch') })
  const res = response()
  await handler({ query: { file: '../../assets/missing' } }, res)
  assert.equal(res.statusCode, 404)
  assert.equal(mock.mock.callCount(), 0)
  assert.equal(res.headers['cache-control'], undefined)
})

test('an unavailable feed returns an error rather than fabricated rows', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: false }))
  const res = response()
  await handler({ query: { file: 'token' } }, res)
  assert.equal(res.statusCode, 502)
  assert.deepEqual(res.body, { error: 'no data' })
  assert.equal(res.headers['cache-control'], undefined)
})
