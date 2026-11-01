import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ChatWidget, { ChatPanel } from '../src/components/terminal/ChatWidget'
import PnlCard from '../src/components/terminal/PnlCard'
import Deploy from '../src/pages/Deploy'
import DeployEntry from '../src/components/terminal/DeployEntry'
import DeployChat from '../src/components/terminal/DeployChat'
import { markWelcomeSeen, welcomeKey } from '../src/lib/welcome'
import type { Agent } from '../src/lib/terminal-model'
import { TerminalDataContext } from '../src/lib/terminal-context'
import RequireAuth from '../src/components/RequireAuth'
import Login from '../src/pages/Login'
import Invite from '../src/pages/Invite'
import { AuthContext, type AuthSession, type BaumProfile } from '../src/lib/auth-context'
import { signInCodeFrom, signInMessage } from '../src/lib/auth'

function render(children: ReactNode, session: Partial<AuthSession> = {}) {
  const value: AuthSession = { user: null, ready: true, error: false, retry() {}, signIn: async () => {}, signOut: async () => {}, ...session }
  return renderToStaticMarkup(createElement(AuthContext.Provider, { value }, children))
}
const privateContent = createElement('div', null, 'PRIVATE TERMINAL')
const guard = () => createElement(RequireAuth, { children: privateContent })
const user: BaumProfile = { username: 'slug', wallets: ['0x0000000000000000000000000000000000000001'], strategy: null, copy: null }

test('PnL artwork and all three choices appear before a share request can finish', () => {
  const agent: Agent = { id: user.wallets[0], name: '@slug', categories: ['Custom'], declared: true, tags: [], trading: { '7d': { wallet: user.wallets[0], pnlUsd: 12.5, volumeUsd: 250, trades: 4, tokens: 1 } }, liquidity: {} }
  const snapshot = { agents: [agent], traders: { '7d': { rows: [agent.trading['7d']!], updatedAt: 1793400000000 } }, lps: {}, token: null, boardError: false, partial: false }
  const html = render(createElement(TerminalDataContext.Provider, { value: { snapshot, loading: false, error: false, refresh() {} } }, createElement(PnlCard, { agent, range: '7d' })), { user })
  assert.match(html, /role="img" aria-label="@slug, 7D PnL \+\$12\.50, classic card"/)
  assert.match(html, /Classic/); assert.match(html, /Spotlight/); assert.match(html, /Hero/)
  assert.doesNotMatch(html, /Preparing your PnL card|generating|<img[^>]*api\/pnl/i)
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
  assert.equal(new Set(ids).size, ids.length, 'Inline cards must not share gradient or circle-clip IDs')
  assert.match(html, /aria-disabled="true"/, 'Sharing waits for the verified server snapshot')
})

test('deploy starts with a blank name and offers named trading agents without a shuffle control', () => {
  const html = render(createElement(Deploy), { user })
  assert.match(html, /id="deploy-name"[^>]*value=""/)
  assert.match(html, /Suggested trading agents/)
  for (const name of ['dca-bot', 'spot-trader', 'hodl-bot', 'stack-bot']) assert.match(html, new RegExp(name))
  assert.doesNotMatch(html, /Shuffle|BraveAmberFox|QuietJadeOtter/)
})

test('chat opens inside SLUGS and never hands a draft to Telegram', () => {
  const launcher = renderToStaticMarkup(createElement(ChatWidget))
  assert.match(launcher, /<button[^>]*aria-label="Chat with Baum"/)
  assert.doesNotMatch(launcher, /href=|t\.me/)
  const panel = renderToStaticMarkup(createElement(TerminalDataContext.Provider, { value: { snapshot: null, loading: false, error: false, refresh() {} } }, createElement(ChatPanel, { draft: 'Keep this draft', onDraft() {}, onClose() {} })))
  assert.match(panel, /Keep this draft/)
  assert.match(panel, /class="t-deploy-chat t-baum-chat"[^>]*role="dialog" aria-modal="false" aria-label="Chat with Baum"/)
  assert.match(panel, /class="t-deploy-chat-head"/)
  assert.match(panel, /class="t-deploy-msg t-deploy-msg--bot"/)
  assert.match(panel, /class="t-deploy-chat-foot"/)
  assert.doesNotMatch(panel, /<dialog|t-floating-inner|t-chat-dialog/)
  assert.match(panel, /<button(?=[^>]*type="submit")(?=[^>]*disabled="")[^>]*>/)
  // The one link is the SLUGS community group (a t.me/+ invite). Drafts never go to Baum
  // in Telegram: no bot links, and nothing says a message was copied or sent there.
  const links = [...panel.matchAll(/href="([^"]*)"/g)].map((match) => match[1])
  assert.equal(links.length, 1)
  assert.match(links[0], /^https:\/\/t\.me\/\+/)
  assert.doesNotMatch(panel, /t\.me\/[A-Za-z0-9_]*bot|Copied for|Opened in|Send in Telegram/i)
})

test('the deploy explanation appears by its button after the welcome tour', () => {
  const first = { ...user, username: 'entry-preview', wallets: ['0xentry-preview'] }
  markWelcomeSeen(welcomeKey(first, null)!)
  const html = render(createElement(DeployEntry, { welcomeOpen: false }), { user: first })
  assert.match(html, /href="\/deploy"[^>]*aria-describedby=/)
  assert.match(html, /Create your own trading agent/)
  assert.match(html, /Use “Deploy a slug” to name your agent/)
  assert.match(html, /aria-label="Dismiss deploy explanation"/)
  const covered = render(createElement(DeployEntry, { welcomeOpen: true }), { user: first })
  assert.doesNotMatch(covered, /Create your own trading agent/)
  assert.doesNotMatch(render(createElement(DeployEntry, { welcomeOpen: false })), /Create your own trading agent/)
})

test('setup chat retains its left corner window and guided first step', () => {
  const html = renderToStaticMarkup(createElement(DeployChat, { username: 'slug', name: 'dca-bot', onClose() {} }))
  assert.match(html, /class="t-deploy-chat"[^>]*role="dialog" aria-modal="false" aria-label="Set up slug\/dca-bot"/)
  assert.match(html, /Setting up · step 1 of 3/)
  assert.match(html, /What should I buy/)
  assert.match(html, /data-chat-input="true"/)
  assert.doesNotMatch(html, /t-baum-chat/)
})

test('terminal content stays hidden while the persisted session is restoring', () => {
  const html = render(guard(), { ready: false })
  assert.match(html, /Restoring your session/)
  assert.doesNotMatch(html, /PRIVATE TERMINAL|data-navigate/)
})

test('a signed-out user is sent to login before terminal content renders', () => {
  const html = render(guard())
  assert.match(html, /data-navigate="\/login"/)
  assert.match(html, /data-replace="true"/)
  assert.doesNotMatch(html, /PRIVATE TERMINAL/)
})

test('a restored session can enter the terminal', () => {
  assert.match(render(guard(), { user }), /PRIVATE TERMINAL/)
})

test('an auth restore failure does not expose cached terminal content', () => {
  const html = render(guard(), { error: true })
  assert.match(html, /Couldn’t restore your session/)
  assert.match(html, /Try again/)
  assert.doesNotMatch(html, /PRIVATE TERMINAL/)
})

test('authenticated login goes to the new home rather than a confirmation message', () => {
  const html = render(createElement(Login), { user })
  assert.match(html, /data-navigate="\/home"/)
  assert.doesNotMatch(html, /Signed in as|login-password/)
})

test('guests log in through Baum in Telegram, with SLUGS\' referral code', () => {
  const html = render(createElement(Login))
  assert.match(html, /href="https:\/\/t\.me\/[^"]+\?start=atp-login-SLUGS"/)
  assert.doesNotMatch(html, /type="password"|data-navigate/)
})

test('returning users on the invite page go directly to the new home', () => {
  const html = render(createElement(Invite), { user })
  assert.match(html, /data-navigate="\/home"/)
  assert.doesNotMatch(html, /invite-code/)
})

test('signed-out visitors keep the existing invite form', () => {
  const html = render(createElement(Invite))
  assert.match(html, /invite-code/)
  assert.doesNotMatch(html, /data-navigate/)
})

test('sign-in failures have plain messages without exposing raw errors', () => {
  assert.match(signInMessage({ reason: 'expired-code' }), /expired/)
  assert.match(signInMessage({ reason: 'baum-unavailable' }), /reach Baum/)
  assert.equal(signInMessage(null), 'Something went wrong. Try again.')
})

test('the code box tells a pasted Baum sign-in link from an invite code', () => {
  const code = 'aB3_-'.repeat(8) + 'xyz'
  assert.equal(signInCodeFrom(`https://www.slugs.run/connect-baum?code=${code}`), code)
  assert.equal(signInCodeFrom(`  slugs.run/connect-baum?code=${code}&utm=tg  `), code)
  assert.equal(signInCodeFrom(code), code)
  assert.equal(signInCodeFrom('MINT-FLASH-38'), null)
  assert.equal(signInCodeFrom('SLUGS-A3X7K2B9'), null)
  assert.equal(signInCodeFrom('https://example.com/?code=short'), null)
})
