import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ChatWidget, { ChatPanel } from '../src/components/terminal/ChatWidget'
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

test('chat opens inside SLUGS and never hands a draft to Telegram', () => {
  const launcher = renderToStaticMarkup(createElement(ChatWidget))
  assert.match(launcher, /<button[^>]*aria-label="Chat with Baum"/)
  assert.doesNotMatch(launcher, /href=|t\.me/)
  const panel = renderToStaticMarkup(createElement(TerminalDataContext.Provider, { value: { snapshot: null, loading: false, error: false, refresh() {} } }, createElement(ChatPanel, { draft: 'Keep this draft', onDraft() {}, onClose() {} })))
  assert.match(panel, /Keep this draft/)
  assert.match(panel, /<button(?=[^>]*type="submit")(?=[^>]*disabled="")[^>]*>/)
  assert.doesNotMatch(panel, /href=|Telegram|Copied for|Opened in/)
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
