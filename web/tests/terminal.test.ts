import assert from 'node:assert/strict'
import { test } from 'node:test'
import { agentPath, assembleAgents, comparisonIds, lpBoard, sortedAgents, traderBoard, type TraderRow } from '../src/lib/terminal-model.ts'

// Fixtures are confined to tests; the application never falls back to sample performance.
const address = (character: string) => `0x${character.repeat(40)}`
const trader = (overrides: Partial<TraderRow> = {}): TraderRow => ({ wallet: address('a'), pnlUsd: 12, volumeUsd: 24, trades: 2, tokens: 1, ...overrides })
const classification = () => ({ category: 'The Floor' as const, declared: false, tags: ['Holds'] })
const board = (rows: TraderRow[]) => traderBoard({ rows, updatedAt: 1_793_388_707_594 })

test('validates snapshots and preserves zero win rates and negative performance', () => {
  const parsed = board([trader({ pnlUsd: -12, winRate: 0 })])
  assert.equal(parsed.rows[0].winRate, 0)
  assert.equal(parsed.rows[0].pnlUsd, -12)
  assert.equal(traderBoard({ rows: [] }).updatedAt, null)
  assert.throws(() => traderBoard({ rows: [trader({ wallet: 'invalid' })] }))
  assert.throws(() => traderBoard({ rows: [trader({ pnlUsd: Infinity })] }))
  assert.throws(() => traderBoard({ rows: [trader({ winRate: 1.5 })] }))
  assert.throws(() => traderBoard({ rows: null }))
})

test('keeps PnL, volume, trades and token counts in their reported ranges', () => {
  const agents = assembleAgents({
    all: board([trader({ pnlUsd: 100, volumeUsd: 500, trades: 40, tokens: 6 })]),
    '7d': board([trader({ pnlUsd: 12, volumeUsd: 24, trades: 2, tokens: 1 })]),
  }, {}, classification)
  assert.equal(agents.length, 1)
  assert.equal(agents[0].trading.all?.trades, 40)
  assert.equal(agents[0].trading['7d']?.trades, 2)
  assert.equal(agents[0].trading['7d']?.volumeUsd, 24)
  assert.equal(agents[0].trading['7d']?.pnlUsd, 12)
  assert.equal(agents[0].trading['24h'], undefined, 'Missing snapshots must not become zero performance')
})

test('merges wallets case-insensitively and reuses declared strategy plus LP membership', () => {
  const lp = lpBoard({ rows: [{ wallet: address('A'), username: 'slug', feesUsd: 3, liquidityUsd: 200, feeAprPercent: null, positions: 1, pools: ['ETH/SLUGS'] }] })
  const agents = assembleAgents({ all: board([trader({ wallet: address('a'), strategy: 'spot' })]) }, { all: lp }, () => ({ category: 'Spot traders', declared: true, tags: [] }), { [address('a')]: 12345 })
  assert.equal(agents.length, 1)
  assert.equal(agents[0].name, '@slug')
  assert.deepEqual(agents[0].categories, ['Spot traders', 'Yield'])
  assert.equal(agents[0].declared, true)
  assert.equal(agents[0].liquidity.all?.liquidityUsd, 200)
  assert.equal(agents[0].boostedUntil, 12345)
})

test('LP-only agents have liquidity metrics without invented trading performance', () => {
  const lp = lpBoard({ rows: [{ wallet: address('b'), feesUsd: 0, liquidityUsd: 20, feeAprPercent: 0, positions: 1, pools: [] }] })
  const agents = assembleAgents({}, { '7d': lp }, classification)
  assert.deepEqual(agents[0].categories, ['Yield'])
  assert.deepEqual(agents[0].trading, {})
  assert.equal(agents[0].liquidity['7d']?.feeAprPercent, 0)
  assert.throws(() => lpBoard({ rows: [{ ...lp.rows[0], pools: [42] }] }))
})

test('sorts actual performance and leaves missing metrics at the bottom', () => {
  const agents = assembleAgents({ '7d': board([
    trader({ wallet: address('a'), pnlUsd: -12, volumeUsd: 200 }),
    trader({ wallet: address('b'), pnlUsd: 25, volumeUsd: 10, winRate: 0 }),
    trader({ wallet: address('c'), pnlUsd: 5, volumeUsd: 400, winRate: 0.5 }),
  ]) }, {}, classification)
  assert.deepEqual(sortedAgents(agents, '7d').map((agent) => agent.id), [address('b'), address('c'), address('a')])
  assert.deepEqual(sortedAgents(agents, '7d', 'volume').map((agent) => agent.id), [address('c'), address('a'), address('b')])
  assert.deepEqual(sortedAgents(agents, '7d', 'wins').map((agent) => agent.id), [address('c'), address('b'), address('a')])
  assert.equal(agents[0].id, address('a'), 'Sorting must not mutate the feed')
})

test('Yield sorts by LP fees rather than unrelated trading PnL', () => {
  const agents = assembleAgents({ all: board([trader({ wallet: address('a'), pnlUsd: 999 }), trader({ wallet: address('b'), pnlUsd: -10 })]) }, { all: lpBoard({ rows: [
    { wallet: address('a'), feesUsd: 2, liquidityUsd: 100, feeAprPercent: 5, positions: 2, pools: [] },
    { wallet: address('b'), feesUsd: 12, liquidityUsd: 10, feeAprPercent: 2, positions: 1, pools: [] },
  ] }) }, classification)
  assert.equal(sortedAgents(agents, 'all', 'pnl', true)[0].id, address('b'))
  assert.equal(sortedAgents(agents, 'all', 'volume', true)[0].id, address('a'))
})

test('unavailable shared comparisons leave room for replacement agents', () => {
  const agents = assembleAgents({ all: board(['a', 'b', 'c', 'd', 'e'].map((id) => trader({ wallet: address(id) }))) }, {}, classification)
  const stale = ['1', '2', '3', '4'].map(address)
  const selected = comparisonIds(stale, agents)
  assert.deepEqual(selected, [], 'Unavailable wallets must not occupy invisible comparison slots')
  assert.deepEqual(comparisonIds([...selected, agents[0].id], agents), [address('a')])
  assert.deepEqual(comparisonIds([...stale, address('A'), address('a'), address('b')], agents), [address('a'), address('b')])
  assert.deepEqual(comparisonIds(agents.map((agent) => agent.id), agents), ['a', 'b', 'c', 'd'].map(address))
})

test('carries the Baum profile picture onto the agent, and skips a bad one without dropping the board', () => {
  const picture = 'https://baumai.xyz/api/avatar/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?v=2'
  const agents = assembleAgents({
    all: board([trader({ avatarUrl: picture }), trader({ wallet: address('b'), avatarUrl: 'javascript:alert(1)' })]),
  }, {}, classification)
  assert.equal(agents.find((agent) => agent.id === address('a'))?.avatarUrl, picture)
  assert.equal(agents.find((agent) => agent.id === address('b'))?.avatarUrl, undefined)
})

test('AI agents keep their slug and open by it; people have none', () => {
  const agents = assembleAgents({
    all: board([
      trader({ wallet: address('a'), username: 'Oakie', slug: 'frank-oak', agentName: 'oak' }),
      trader({ wallet: address('b'), username: 'frank' }),
      trader({ wallet: address('c'), slug: 'Not A Slug' }),
    ]),
  }, {}, classification)
  const [agent, person, odd] = [address('a'), address('b'), address('c')].map((id) => agents.find((a) => a.id === id)!)
  assert.equal(agent.slug, 'frank-oak')
  assert.equal(agent.name, '@Oakie')
  assert.equal(agentPath(agent), '/agents/frank-oak')
  assert.equal(person.slug, undefined)
  assert.equal(agentPath(person), `/agents/${address('b')}`)
  assert.equal(odd.slug, undefined)
})

test('an AI agent that has not traded yet gets a page from what Baum says about it', async () => {
  const { launchedAgent } = await import('../src/lib/terminal-model.ts')
  const category = (strategy: string) => strategy === 'spot' ? 'Spot traders' as const : undefined
  const kyle = launchedAgent({ wallet: '0xABCDEFabcdef0123456789abcdef0123456789AB', slug: 'winston-kyle', name: 'kyle', strategy: { id: 'spot', name: 'Spot' }, avatarUrl: 'https://baumai.xyz/api/avatar/0xabc?v=1' }, category)
  assert.deepEqual(kyle, {
    id: '0xabcdefabcdef0123456789abcdef0123456789ab', name: 'kyle', categories: ['Spot traders'], declared: true,
    tags: [], trading: {}, liquidity: {}, slug: 'winston-kyle', avatarUrl: 'https://baumai.xyz/api/avatar/0xabc?v=1',
  })
  assert.equal(agentPath(kyle!), '/agents/winston-kyle')
  assert.equal(launchedAgent({ wallet: 'nope', name: 'kyle' }, category), null)
  assert.equal(launchedAgent({ reason: 'not-found' }, category), null)
  assert.deepEqual(launchedAgent({ wallet: '0x' + '1'.repeat(40), name: 'x', slug: 'Bad Slug', strategy: null }, category)?.categories, [])
})

test('search finds agents by @username, slug or wallet, and Baum’s agents that haven’t traded', async () => {
  const { foundAgents, matchesSearch } = await import('../src/lib/terminal-model.ts')
  const category = (strategy: string) => strategy === 'spot' ? 'Spot traders' as const : undefined
  const [kyle] = foundAgents({ agents: [{ wallet: '0x6deaf784c9d67892e91633f8dc2b25ffa366910e', slug: 'hornygoat-kyle', name: 'kyle', strategy: { id: 'spot', name: 'Spot' } }, { wallet: 'bad', name: 'x' }] }, category)
  assert.equal(kyle.slug, 'hornygoat-kyle')
  assert.deepEqual(foundAgents({ reason: 'short-query' }, category), [])
  assert.equal(foundAgents({ agents: [{ wallet: 'bad', name: 'x' }] }, category).length, 0)
  for (const query of ['kyle', '@hornygoat', 'HORNYGOAT-KYLE', '0x6deaf7', '']) assert.equal(matchesSearch(kyle, query), true, query)
  assert.equal(matchesSearch(kyle, 'oak'), false)
})
