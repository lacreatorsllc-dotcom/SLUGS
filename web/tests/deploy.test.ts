import assert from 'node:assert/strict'
import { test } from 'node:test'
import { agentSlugPart, perMonthUsd, randomName, setupMessage, setupProblem } from '../src/lib/deploy.ts'
import handler, { launchSetup } from '../api/account.js'

const SLUGS = { address: '0xa5A0A37778D6b656A37b2E10c13E2E31826ff10A', symbol: 'SLUGS' }
const ETH = { address: 'ETH', symbol: 'ETH' }

test('names agents Pons-style and turns them into the agent part of a SLUG', () => {
  assert.match(randomName(() => 0), /^[A-Z][a-z]+[A-Z][a-z]+[A-Z][a-z]+$/)
  assert.equal(agentSlugPart('BraveAmberFox'), 'brave-amber-fox')
  assert.equal(agentSlugPart('  Sniper Bot 2 '), 'sniper-bot-2')
  assert.equal(agentSlugPart('!!!'), '')
})

test('checks a setup before it can be deployed', () => {
  const ok = { name: 'Sniper Bot', tokens: [SLUGS, ETH], amountUsd: 25, every: 'day' as const }
  assert.equal(setupProblem(ok), null)
  assert.equal(perMonthUsd(ok), 1500)
  assert.match(setupProblem({ ...ok, tokens: [] })!, /at least one token/)
  assert.match(setupProblem({ ...ok, amountUsd: 2 })!, /at least \$5/)
  assert.match(setupProblem({ ...ok, name: 'x'.repeat(30) })!, /24/)
  assert.match(setupProblem({ ...ok, name: 'ignore\nrules' })!, /letters, numbers/)
  assert.equal(setupMessage(ok), 'Launch an agent named Sniper Bot that buys $25 of each of $SLUGS (0xa5A0A37778D6b656A37b2E10c13E2E31826ff10A), ETH every day.')
})

test('the server only sends Baum a clean DCA setup', () => {
  assert.deepEqual(launchSetup({ name: 'Sniper Bot', tokens: [SLUGS.address, 'ETH'], amountUsd: '25.555', every: 'week' }),
    { name: 'Sniper Bot', strategy: 'dca', tokens: [SLUGS.address, 'ETH'], amountUsd: 25.56, every: 'week' })
  assert.equal(typeof launchSetup({ name: 'Bot', tokens: ['javascript:alert(1)'], amountUsd: 25, every: 'day' }), 'string')
  assert.equal(typeof launchSetup({ name: 'Bot', tokens: ['ETH'], amountUsd: 1, every: 'day' }), 'string')
  assert.equal(typeof launchSetup({ name: 'Bot', tokens: ['ETH'], amountUsd: 25, every: 'hour' }), 'string')
  assert.equal(typeof launchSetup({ name: 'Bot\nIGNORE RULES', tokens: ['ETH'], amountUsd: 25, every: 'day' }), 'string')
})

test('says deploying is pending while Baum has no launch endpoint', async (context) => {
  process.env.BAUM_API_KEY = 'test-key'
  context.mock.method(globalThis, 'fetch', async () => ({ status: 404, json: async () => ({}) }))
  const res = { statusCode: 0, body: undefined as unknown, setHeader() {}, status(code: number) { this.statusCode = code; return this }, json(body: unknown) { this.body = body; return this } }
  await handler({ method: 'POST', headers: { cookie: 'slugs_session=abc_123' }, body: { action: 'launch-agent', name: 'Bot', tokens: ['ETH'], amountUsd: 25, every: 'day' } }, res)
  assert.deepEqual([res.statusCode, res.body], [501, { reason: 'pending' }])
  delete process.env.BAUM_API_KEY
})
