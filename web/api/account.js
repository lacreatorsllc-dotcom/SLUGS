// Settings for the signed-in person's Baum account: username, picture, email and their
// AI agents' usernames. Passed to Baum's partner account API (baum-monorepo
// lib/partner-account.ts) with SLUGS' key and the session cookie from session.js, so
// neither reaches page scripts.
//
//   GET  ?action=me
//   POST { action: 'username', username } | { action: 'agent-username', agent, username }
//        { action: 'email', email } | { action: 'avatar', picture: <base64>, type } | { action: 'avatar-clear' }
//        { action: 'launch-agent', name, tokens: [address | 'ETH'], amountUsd, every: 'day' | 'week' }
//
// launch-agent makes a DCA agent on the person's Baum account, the same one Baum makes in
// Telegram (docs/handoffs/2026-10-31-baum-launch-request.md). Until Baum opens that to
// partners it answers 501 pending, and the Deploy page hands the setup to Telegram.

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const sessionFrom = (req) => (req.headers.cookie ?? '').match(/(?:^|;\s*)slugs_session=([A-Za-z0-9_-]+)/)?.[1] ?? null
// Vercel takes request bodies up to 4.5 MB, so a picture as base64 stays under about 3 MB.
const MAX_PICTURE = 3 * 1024 * 1024

async function baum(method, action, session, body) {
  const res = await fetch(`${BAUM}/api/partner/account/${action}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.BAUM_API_KEY}`,
      'x-baum-session': session,
      ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  }).catch(() => null)
  return { status: res?.status ?? 502, json: res ? await res.json().catch(() => ({})) : { reason: 'baum-unavailable' } }
}

const TOKEN = /^(?:0x[0-9a-fA-F]{40}|ETH)$/

/** A DCA setup to send Baum, or why it can't be sent. Mirrors src/lib/deploy.ts. */
export function launchSetup(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{0,23}$/.test(name)) return 'Give your agent a name: letters, numbers, spaces or hyphens, up to 24.'
  const tokens = Array.isArray(body.tokens) ? [...new Set(body.tokens.filter((token) => typeof token === 'string' && TOKEN.test(token)))] : []
  if (!tokens.length || tokens.length > 5 || tokens.length !== body.tokens.length) return 'Pick one to five tokens by contract address.'
  const amountUsd = Number(body.amountUsd)
  if (!Number.isFinite(amountUsd) || amountUsd < 5 || amountUsd > 10000) return 'Each buy needs to be between $5 and $10,000.'
  if (body.every !== 'day' && body.every !== 'week') return 'Choose daily or weekly.'
  return { name, strategy: 'dca', tokens, amountUsd: Math.round(amountUsd * 100) / 100, every: body.every }
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!process.env.BAUM_API_KEY) return res.status(503).json({ reason: 'not-configured' })
  const session = sessionFrom(req)
  if (!session) return res.status(401).json({ reason: 'signed-out' })
  const send = ({ status, json }) => res.status(status).json(json)

  if (req.method === 'GET') return send(await baum('GET', 'me', session))
  if (req.method !== 'POST') return res.status(405).json({ reason: 'method' })
  const body = req.body ?? {}
  const str = (v) => (typeof v === 'string' ? v : '')
  switch (body.action) {
    case 'username':
      return send(await baum('POST', 'username', session, { username: str(body.username) }))
    case 'agent-username':
      return send(await baum('POST', 'agent-username', session, { agent: str(body.agent), username: str(body.username) }))
    case 'email':
      return send(await baum('POST', 'email', session, { email: str(body.email) }))
    case 'launch-agent': {
      const setup = launchSetup(body)
      if (typeof setup === 'string') return res.status(400).json({ reason: setup })
      const answer = await baum('POST', 'agents/launch', session, setup)
      if (answer.status === 404 || answer.status === 405) return res.status(501).json({ reason: 'pending' })
      return send(answer)
    }
    case 'avatar-clear':
      return send(await baum('DELETE', 'avatar', session))
    case 'avatar': {
      const bytes = Buffer.from(str(body.picture), 'base64')
      if (!bytes.length) return res.status(400).json({ reason: 'No picture in that upload.' })
      if (bytes.length > MAX_PICTURE) return res.status(413).json({ reason: 'That picture is over 3 MB. Try a smaller one.' })
      const form = new FormData()
      form.append('picture', new Blob([bytes], { type: str(body.type) || 'application/octet-stream' }), 'picture')
      return send(await baum('POST', 'avatar', session, form))
    }
  }
  return res.status(404).json({ reason: 'unknown-action' })
}
