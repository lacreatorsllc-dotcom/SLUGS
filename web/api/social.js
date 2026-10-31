// Follows and display names, kept by Baum with the account, like usernames and
// pictures. These forward to Baum's partner social endpoints, asked for in
// docs/handoffs/2026-10-30-baum-tokens-request.md, with SLUGS' key and the session
// cookie from session.js. Until Baum ships them this answers 503 not-configured and
// the site hides follows and display names.
//
//   GET  ?wallet=0x…                              counts, display name, and whether you follow it
//   GET  ?wallet=0x…&list=followers|following     the people, newest first
//   POST { action: 'follow' | 'unfollow', wallet }
//   POST { action: 'display-name', name }         '' clears it

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const ADDRESS = /^0x[0-9a-f]{40}$/
export const MAX_NAME = 32

const sessionFrom = (req) => (req.headers?.cookie ?? '').match(/(?:^|;\s*)slugs_session=([A-Za-z0-9_-]+)/)?.[1] ?? null

// The same hidden characters src/lib/untrusted.ts strips: controls, zero-width and
// invisible characters, and bidi overrides that can disguise a name.
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u115f\u1160\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2069\u3164\ufeff\ufff9-\ufffb]/g

/** Trims a display name and takes out hidden characters; null when it's too long. */
export function cleanName(value) {
  const name = String(value ?? '').replace(/\s+/g, ' ').replace(HIDDEN, '').replace(/ {2,}/g, ' ').trim()
  return [...name].length > MAX_NAME ? null : name
}

async function baum(method, path, session, body) {
  const res = await fetch(`${BAUM}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.BAUM_API_KEY}`,
      ...(session ? { 'x-baum-session': session } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  return { status: res?.status ?? 502, json: res ? await res.json().catch(() => ({})) : { reason: 'baum-unavailable' } }
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!process.env.BAUM_API_KEY) return res.status(503).json({ reason: 'not-configured' })
  const session = sessionFrom(req)
  // Baum answers 404 until its social endpoints ship: the site keeps follows hidden.
  const send = ({ status, json }) => (status === 404 ? res.status(503).json({ reason: 'not-configured' }) : res.status(status).json(json))

  if (req.method === 'GET') {
    const wallet = String(req.query?.wallet ?? '').toLowerCase()
    if (!ADDRESS.test(wallet)) return res.status(400).json({ reason: 'bad-wallet' })
    const list = req.query?.list
    if (list === undefined) return send(await baum('GET', `/api/partner/social?wallet=${wallet}`, session))
    if (list !== 'followers' && list !== 'following') return res.status(400).json({ reason: 'bad-list' })
    return send(await baum('GET', `/api/partner/social/list?wallet=${wallet}&list=${list}`, session))
  }
  if (req.method !== 'POST') return res.status(405).json({ reason: 'method' })
  if (!session) return res.status(401).json({ reason: 'signed-out' })
  const body = req.body ?? {}

  if (body.action === 'follow' || body.action === 'unfollow') {
    const wallet = String(body.wallet ?? '').toLowerCase()
    if (!ADDRESS.test(wallet)) return res.status(400).json({ reason: 'bad-wallet' })
    return send(await baum(body.action === 'follow' ? 'POST' : 'DELETE', '/api/partner/social/follow', session, { wallet }))
  }
  if (body.action === 'display-name') {
    const name = cleanName(body.name)
    if (name === null) return res.status(400).json({ reason: `Keep it to ${MAX_NAME} characters.` })
    return send(await baum('POST', '/api/partner/account/display-name', session, { name }))
  }
  return res.status(404).json({ reason: 'unknown-action' })
}
