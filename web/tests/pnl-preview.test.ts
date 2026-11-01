import assert from 'node:assert/strict'
import { test } from 'node:test'
import { avatarForCard, pnlPreview } from '../src/lib/pnl-preview.ts'
import type { Agent } from '../src/lib/terminal-model.ts'

const wallet = `0x${'a'.repeat(40)}`
const agent: Agent = { id: wallet, name: '@alice', categories: ['Custom'], declared: true, tags: [], trading: { '7d': { wallet, pnlUsd: -12, volumeUsd: 250, trades: 4, tokens: 1 } }, liquidity: {}, avatarUrl: `https://baumai.xyz/api/avatar/${wallet}` }

test('an instant preview uses the selected reported row and never fills a missing range with zero', () => {
  const preview = pnlPreview(agent, '7d', 1793400000000, null)!
  assert.equal(preview.pnlUsd, -12)
  assert.equal(preview.volumeUsd, 250)
  assert.equal(preview.updatedAt, 1793400000000)
  assert.equal(pnlPreview(agent, '24h', 1793400000000, null), null)
})

test('profile personalization uses the owner’s current picture without putting it on someone else’s performance', () => {
  const user = { username: 'new-name', wallets: [wallet], avatarUrl: `https://baumai.xyz/api/avatar/${wallet}?v=2`, strategy: null, copy: null, invites: [{ code: 'ALICE', aliases: ['MY-SLUG'], clicks: 1, accounts: 1 }] }
  const own = pnlPreview(agent, '7d', 1793400000000, user)!
  assert.equal(own.name, '@new-name')
  assert.equal(own.avatarUrl, user.avatarUrl)
  assert.equal(own.ref, 'MY-SLUG')
  assert.equal(pnlPreview({ ...agent, id: wallet.toUpperCase() }, '7d', 1793400000000, user)!.avatarUrl, user.avatarUrl)
  const other = pnlPreview(agent, '7d', 1793400000000, { ...user, wallets: [`0x${'b'.repeat(40)}`] })!
  assert.equal(other.name, agent.name)
  assert.equal(other.avatarUrl, agent.avatarUrl)
  assert.equal(avatarForCard('javascript:alert(1)'), undefined)
  assert.equal(avatarForCard('https://example.com/tracker'), undefined)
})
