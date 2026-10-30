import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { User } from 'firebase/auth'
import RequireAuth from '../src/components/RequireAuth'
import Login from '../src/pages/Login'
import Invite from '../src/pages/Invite'
import { AuthContext, type AuthSession } from '../src/lib/auth-context'
import { authMessage } from '../src/lib/auth'

function render(children: ReactNode, session: Partial<AuthSession> = {}) {
  const value: AuthSession = { user: null, ready: true, error: false, retry() {}, signIn: async () => {}, signOut: async () => {}, ...session }
  return renderToStaticMarkup(createElement(AuthContext.Provider, { value }, children))
}
const privateContent = createElement('div', null, 'PRIVATE TERMINAL')
const guard = () => createElement(RequireAuth, { children: privateContent })
const user = { uid: 'test-user' } as User

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

test('login keeps the email/password form for guests', () => {
  const html = render(createElement(Login))
  assert.match(html, /autoComplete="email"/)
  assert.match(html, /autoComplete="current-password"/)
  assert.match(html, /type="password"/)
  assert.doesNotMatch(html, /data-navigate/)
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

test('auth failures have recoverable messages without exposing raw provider errors', () => {
  assert.equal(authMessage({ code: 'auth/invalid-credential', message: 'provider detail' }), 'Wrong email or password.')
  assert.match(authMessage({ code: 'auth/network-request-failed' }), /connection/)
  assert.equal(authMessage(null), 'Something went wrong. Try again.')
})
