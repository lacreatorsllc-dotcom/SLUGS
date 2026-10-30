// Signing in with Baum. The Sign in button opens Baum in Telegram (atp-login-CODE),
// and Baum answers with a one-time button to GET /api/session?code=…. The code is
// traded here, with SLUGS' key, for a Baum session kept in an httpOnly cookie, then
// on to /profile. DELETE signs out, at Baum too.

import { baum, clearCookie, sessionFrom, setCookie } from './_session.js'

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (req.method === 'DELETE') {
    const session = sessionFrom(req)
    if (session) await baum('/api/partner/session', { method: 'DELETE', headers: { 'x-baum-session': session } })
    clearCookie(res)
    return res.status(200).json({ ok: true })
  }
  const code = String(req.query.code ?? '')
  const answer = code ? await baum('/api/partner/session', { method: 'POST', body: JSON.stringify({ code }) }) : null
  const body = answer?.ok ? await answer.json().catch(() => null) : null
  if (!body?.session) {
    console.warn(`sign-in: Baum answered ${answer?.status ?? 'nothing'}`)
    res.setHeader('location', '/profile?signin=failed')
    return res.status(302).end()
  }
  setCookie(res, body.session)
  res.setHeader('location', '/profile')
  return res.status(302).end()
}
