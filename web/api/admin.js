// The admin page (/admin), run on Baum's partner admin API with SLUGS' key
// (baum-monorepo lib/partner-admin.ts). Admins are the Baum account that holds
// SLUGS' key (mememarketer) and anyone added to it.
//
// The admin session lives in an httpOnly cookie for 12 hours, so neither it nor the
// key reaches page scripts. Every sign-in passes Baum the browser's IP, Vercel's
// geolocation for it and the user agent, so Baum logs where each one came from and
// warns the admins in Telegram about a new country.
//
//   GET  ?action=me | report | logins | device | review | funnel
//   POST { action: 'password', email, password } | { action: 'forgot', email }
//        { action: 'reset', token, password }    | { action: 'code', code }
//        { action: 'baum' }  (already signed in to SLUGS with Baum)
//        { action: 'device' } (ask the admins in Telegram) | { action: 'refresh' } | { action: 'logout' }
//
// The waitlist (people who shilled SLUGS on X, from Telegram or this site's popup):
//        { action: 'review', id, decision: 'approve' | 'reject', score }
//        { action: 'draw' }  (picks one approved person, weighted by tickets)
//        { action: 'auto', on }  (one draw a day, until nobody approved is left)

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const ADMIN = 'slugs_admin'
const DEVICE = 'slugs_admin_device'
const SITE_NAME = 'SLUGS'
// SLUGS' own referral code, for the report (an alias is fine; Baum resolves it).
const CODES = [process.env.VITE_BAUM_REF || 'SLUGS']

const cookieOf = (req, name) => (req.headers.cookie ?? '').match(new RegExp(`(?:^|;\\s*)${name}=([A-Za-z0-9_.-]+)`))?.[1] ?? null
const cookie = (name, value, maxAge) => `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`

function clientOf(req) {
  const h = (name) => {
    const v = req.headers[name]
    if (!v) return null
    try { return decodeURIComponent(String(v)) } catch { return String(v) }
  }
  return {
    ip: String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || h('x-real-ip'),
    city: h('x-vercel-ip-city'),
    region: h('x-vercel-ip-country-region'),
    country: h('x-vercel-ip-country'),
    userAgent: h('user-agent'),
  }
}

// Links in Baum's emails (password resets) always point at SLUGS' own address, never at
// the request's Host, which a caller could set.
const SITE_ORIGIN = 'https://www.slugs.run'
function siteOf() {
  return { name: SITE_NAME, adminUrl: `${SITE_ORIGIN}/admin` }
}

async function baum(method, path, { body, admin, session } = {}) {
  const res = await fetch(`${BAUM}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.BAUM_API_KEY}`,
      'content-type': 'application/json',
      ...(admin ? { 'x-baum-admin': admin } : {}),
      ...(session ? { 'x-baum-session': session } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).catch(() => null)
  const json = res ? await res.json().catch(() => ({})) : { reason: 'baum-unavailable' }
  return { status: res?.status ?? 502, json }
}

/** Passes a sign-in answer on, keeping the session as the admin cookie. */
function signedIn(res, answer, extraCookies = []) {
  if (answer.status !== 200 || !answer.json.session) {
    if (extraCookies.length) res.setHeader('set-cookie', extraCookies)
    return res.status(answer.status === 200 ? 502 : answer.status).json({ reason: answer.json.reason ?? 'failed' })
  }
  res.setHeader('set-cookie', [cookie(ADMIN, answer.json.session, 12 * 3600), ...extraCookies])
  return res.status(200).json({ who: answer.json.who ?? null })
}

// The boxes an admin ticked, and nothing else.
const scoreOf = (raw) => Object.fromEntries(['why', 'friend', 'friendWhy'].map((k) => [k, Boolean(raw?.[k])]))

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!process.env.BAUM_API_KEY) return res.status(503).json({ reason: 'not-configured' })
  const admin = cookieOf(req, ADMIN)
  const client = clientOf(req)
  const site = siteOf()

  if (req.method === 'GET') {
    const action = String(req.query.action ?? 'me')
    if (action === 'device') {
      const [id, poll] = (cookieOf(req, DEVICE) ?? '').split('.')
      if (!id || !poll) return res.status(404).json({ state: 'expired' })
      const answer = await baum('GET', `/api/partner/admin/device?id=${encodeURIComponent(id)}&poll=${encodeURIComponent(poll)}`)
      const state = answer.json.state
      if (state === 'approved') return signedIn(res, answer, [cookie(DEVICE, '', 0)])
      if (state !== 'waiting') res.setHeader('set-cookie', cookie(DEVICE, '', 0))
      return res.status(200).json({ state: state ?? 'expired' })
    }
    if (!['me', 'report', 'logins', 'review', 'funnel'].includes(action)) return res.status(404).json({ reason: 'unknown-action' })
    if (!admin) return res.status(401).json({ reason: 'signed-out' })
    const answer = await baum('GET', `/api/partner/admin/${action}`, { admin })
    if (answer.status === 401) res.setHeader('set-cookie', cookie(ADMIN, '', 0))
    return res.status(answer.status).json(answer.json)
  }

  if (req.method !== 'POST') return res.status(405).json({ reason: 'method' })
  const body = req.body ?? {}
  const str = (v) => (typeof v === 'string' ? v : '')
  switch (body.action) {
    case 'password':
      return signedIn(res, await baum('POST', '/api/partner/admin/login-password', { body: { email: str(body.email), password: str(body.password), client, site } }))
    case 'forgot': {
      const answer = await baum('POST', '/api/partner/admin/forgot', { body: { email: str(body.email), client, site } })
      return res.status(answer.status === 429 ? 429 : 200).json(answer.status === 429 ? answer.json : { ok: true })
    }
    case 'reset':
      return signedIn(res, await baum('POST', '/api/partner/admin/reset', { body: { token: str(body.token), password: str(body.password), client, site } }))
    case 'code': {
      // A one-time link from Baum (/admin, or Log in with Baum): a Baum session first, then admin.
      const user = await baum('POST', '/api/partner/session', { body: { code: str(body.code) } })
      if (user.status !== 200 || !user.json.session) return res.status(user.status === 200 ? 502 : user.status).json({ reason: user.json.reason ?? 'expired-code' })
      return signedIn(
        res,
        await baum('POST', '/api/partner/admin/login-baum', { body: { session: user.json.session, client, site } }),
        [cookie('slugs_session', user.json.session, 30 * 86400)],
      )
    }
    case 'baum': {
      const session = cookieOf(req, 'slugs_session')
      if (!session) return res.status(401).json({ reason: 'signed-out' })
      return signedIn(res, await baum('POST', '/api/partner/admin/login-baum', { body: { session, client, site } }))
    }
    case 'device': {
      const answer = await baum('POST', '/api/partner/admin/device', { body: { client, site } })
      if (answer.status !== 200 || !answer.json.id) return res.status(answer.status === 200 ? 502 : answer.status).json({ reason: answer.json.reason ?? 'failed' })
      res.setHeader('set-cookie', cookie(DEVICE, `${answer.json.id}.${answer.json.poll}`, 10 * 60))
      return res.status(200).json({ state: 'waiting' })
    }
    case 'refresh': {
      if (!admin) return res.status(401).json({ reason: 'signed-out' })
      const answer = await baum('POST', '/api/partner/admin/report', { admin, body: { codes: CODES } })
      return res.status(answer.status).json(answer.json)
    }
    case 'review':
    case 'draw':
    case 'auto': {
      if (!admin) return res.status(401).json({ reason: 'signed-out' })
      const sent = body.action === 'review'
        ? { id: str(body.id), decision: body.decision === 'approve' ? 'approve' : 'reject', score: scoreOf(body.score) }
        : body.action === 'auto' ? { on: body.on === true } : {}
      const answer = await baum('POST', `/api/partner/admin/${body.action}`, { admin, body: sent })
      if (answer.status === 401) res.setHeader('set-cookie', cookie(ADMIN, '', 0))
      return res.status(answer.status).json(answer.json)
    }
    case 'logout':
      if (admin) await baum('POST', '/api/partner/admin/logout', { admin })
      res.setHeader('set-cookie', cookie(ADMIN, '', 0))
      return res.status(200).json({ ok: true })
  }
  return res.status(404).json({ reason: 'unknown-action' })
}
