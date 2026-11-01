// Paper trading strategies from Baum (src/lib/paper.ts), passed on with SLUGS' key so the
// browser never holds it. Baum charges SLUGS for hosted pages: 100 credits the first time
// a strategy gets a page here, 10 for each new visitor in an hour, 3 when the page is due
// a refresh. The board is free.
//
//   GET ?mine=1   the board: public strategies, best return over holding BTC first;
//                 mine=1 only those from SLUGS' own people → { strategies }
//   GET ?id=      one strategy, for this browser's visitor id (the slugs_vid cookie)
//                 → { strategy, links } | { reason: 'resting' | 'not-found' | ... }

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const ID = /^[A-Za-z0-9_-]{8}$/
const VISITOR = /^[A-Za-z0-9_-]{16,64}$/

// Per address, per warm instance: enough for anybody reading pages, not for a script.
const PER_MINUTE = 60
const hits = new Map()
function allowed(ip) {
  const now = Date.now()
  const seen = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  if (seen.length >= PER_MINUTE) return false
  seen.push(now)
  hits.set(ip, seen)
  if (hits.size > 5_000) hits.clear()
  return true
}

const ipOf = (req) => String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || String(req.headers['x-real-ip'] ?? '') || 'unknown'
const visitorOf = (req) => (req.headers.cookie ?? '').match(/(?:^|;\s*)slugs_vid=([A-Za-z0-9_-]{16,64})/)?.[1] ?? null

async function baum(path, init = {}) {
  const res = await fetch(`${BAUM}/api/partner/paper/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.BAUM_API_KEY}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
  if (!res) return { status: 502, body: {} }
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

// The board for a minute, so a busy page asks Baum once.
const boards = new Map()
async function board(mine) {
  const held = boards.get(mine)
  if (held && Date.now() - held.at < 60_000) return held
  const got = await baum(`list${mine ? '?mine=1' : ''}`)
  if (got.status !== 200) return got
  const fresh = { at: Date.now(), status: 200, body: { strategies: Array.isArray(got.body.strategies) ? got.body.strategies : [] } }
  boards.set(mine, fresh)
  return fresh
}

const view = (id, visitor) => baum(`view?id=${id}&visitor=${visitor}`)

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!process.env.BAUM_API_KEY) return res.status(503).json({ reason: 'not-configured' })
  if (req.method !== 'GET') return res.status(405).json({ reason: 'method' })
  if (!allowed(ipOf(req))) return res.status(429).json({ reason: 'slow-down' })

  const id = typeof req.query?.id === 'string' ? req.query.id : null
  if (id === null) {
    const got = await board(req.query?.mine === '1')
    return got.status === 200 ? res.status(200).json(got.body) : res.status(502).json({ reason: 'baum-unavailable' })
  }

  if (!ID.test(id)) return res.status(400).json({ reason: 'bad-id' })
  const visitor = visitorOf(req)
  if (!visitor || !VISITOR.test(visitor)) return res.status(400).json({ reason: 'no-visitor' })

  let got = await view(id, visitor)
  // The first visit makes the page; Baum makes it once and answers the same page after.
  if (got.status === 404 && got.body.reason === 'no-page') {
    const made = await baum('page', { method: 'POST', body: JSON.stringify({ id }) })
    if (made.status === 402) return res.status(402).json({ reason: 'resting' })
    if (made.status === 404) return res.status(404).json({ reason: 'not-found' })
    if (made.status !== 200) return res.status(502).json({ reason: 'baum-unavailable' })
    got = await view(id, visitor)
  }
  if (got.status === 200) return res.status(200).json({ strategy: got.body.strategy, links: got.body.links })
  if (got.status === 402) return res.status(402).json({ reason: 'resting' })
  if (got.status === 404) return res.status(404).json({ reason: 'not-found' })
  if (got.status === 429) return res.status(429).json({ reason: 'slow-down' })
  console.warn(`paper: Baum answered ${got.status}`)
  return res.status(502).json({ reason: 'baum-unavailable' })
}
