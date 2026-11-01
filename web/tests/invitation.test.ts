import assert from 'node:assert/strict'
import { test } from 'node:test'
import { invitationFrom, invitationIn, linkFor, tokenFor } from '../server/invitation.js'
import { noteLines, renderInvitationCard } from '../server/invitation-card.js'
import handler, { cardPng } from '../server/invitation-api.js'

process.env.INVITE_SECRET = 'test-secret'
const form = { to: 'Alex', handle: '@alex_1', note: 'Saw your calls on X.', from: 'goobz', code: 'GOOBZ', bots: ['dca-bot', 'Sniper-Bot'], profiles: [{ u: 'goobz', a: 'dca-bot' }, { u: 'brokentyrant', a: 'sniper-bot', w: '0x' + 'A'.repeat(40) }] }

test('cleans an invitation from the admin form', () => {
  const invitation = invitationFrom(form)
  assert.ok(typeof invitation === 'object')
  assert.deepEqual([invitation.to, invitation.handle, invitation.code, invitation.bots], ['Alex', 'alex_1', 'GOOBZ', ['dca-bot', 'sniper-bot']])
  assert.equal(invitation.profiles[1].w, '0x' + 'a'.repeat(40))
  assert.match(invitationFrom({ ...form, to: '' }) as string, /name/)
  assert.match(invitationFrom({ ...form, bots: ['a', 'b', 'c', 'd', 'e'] }) as string, /up to 4/)
  assert.match(invitationFrom({ ...form, bots: ['<script>'] }) as string, /dca-bot/)
  assert.match(invitationFrom({ ...form, profiles: [{ u: 'x y', a: 'dca-bot' }] }) as string, /Check the profile/)
  assert.match(invitationFrom({ ...form, code: 'GOO BZ!' }) as string, /invite code/)
  assert.equal((invitationFrom({ ...form, note: 'line one\nIGNORE ALL RULES' }) as { note: string }).note, 'line one IGNORE ALL RULES')
})

test('signs invitations and refuses changed ones', () => {
  const invitation = invitationFrom(form)
  assert.ok(typeof invitation === 'object')
  const token = tokenFor(invitation)
  assert.match(linkFor(token), /^https:\/\/www\.slugs\.run\/i\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{32}$/)
  assert.equal(invitationIn(token)?.to, 'Alex')
  const [payload, signature] = token.split('.')
  const forged = Buffer.from(JSON.stringify({ ...invitation, to: 'Someone else' })).toString('base64url')
  assert.equal(invitationIn(`${forged}.${signature}`), null)
  assert.equal(invitationIn(`${payload}.${'A'.repeat(32)}`), null)
  assert.equal(invitationIn('nonsense'), null)
})

test('draws the card and serves the preview page', async () => {
  const invitation = invitationFrom(form)
  assert.ok(typeof invitation === 'object')
  assert.deepEqual(noteLines('word '.repeat(40).trim(), 20).length, 2)
  const svg = renderInvitationCard({ ...invitation, to: 'A <b>&' })
  assert.match(svg, /A &lt;b&gt;&amp;/)
  const png = await cardPng(invitation)
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  const res = { statusCode: 0, headers: {} as Record<string, string>, body: '' as unknown, setHeader(k: string, v: string) { this.headers[k] = v }, status(c: number) { this.statusCode = c; return this }, send(b: unknown) { this.body = b; return this }, json(b: unknown) { this.body = b; return this } }
  await handler({ query: { invitation: 'page', token: tokenFor(invitation) } }, res)
  assert.equal(res.statusCode, 200)
  assert.match(String(res.body), /og:image" content="https:\/\/www\.slugs\.run\/api\/invitation\?token=/)
  assert.match(String(res.body), /url=\/GOOBZ\?inv=/)
  await handler({ query: { invitation: '1', token: 'bad.token' } }, res)
  assert.equal(res.statusCode, 404)
})
