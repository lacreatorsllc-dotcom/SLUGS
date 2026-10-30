// Serves the site's data files (/data/<file>.json, rewritten here by vercel.json).
//
// The leaderboards come from Baum's paid API when BAUM_API_KEY is set in the Vercel
// project, so the key never reaches the browser. Without it, or when Baum errors
// (402 out of credits, down), they come from the Agent Trading Platform's published
// copy, which reads the same Baum boards every 10 minutes. The token stats and the
// weekly winners always come from there: its job scans SLUGS burns for boosts.
//
// Vercel's CDN caches each answer for 10 minutes, so a key spends about
// 6 boards × 6 an hour however many people visit.

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const FALLBACK = (process.env.DATA_FALLBACK_URL ?? 'https://gumdropsteve.github.io/agent-trading-platform/').replace(/\/?$/, '/')

// file -> the Baum board it's read from; files not listed are only read from the fallback.
const BOARDS = {
  'leaderboard-24h': ['traders', '24h'],
  'leaderboard-7d': ['traders', '7d'],
  'leaderboard-all': ['traders', 'all'],
  'lps-24h': ['lps', '24h'],
  'lps-7d': ['lps', '7d'],
  'lps-all': ['lps', 'all'],
}
const FILES = new Set([...Object.keys(BOARDS), 'token', 'winners'])

async function fromBaum(file) {
  const key = process.env.BAUM_API_KEY
  const board = BOARDS[file]
  if (!key || !board) return null
  const res = await fetch(`${BAUM}/api/leaderboard?board=${board[0]}&range=${board[1]}`, {
    headers: { authorization: `Bearer ${key}` },
  }).catch(() => null)
  if (res?.ok) return res.text()
  console.warn(`${file}: Baum answered ${res?.status ?? 'nothing'}`)
  return null
}

async function fromFallback(file) {
  const res = await fetch(`${FALLBACK}data/${file}.json`).catch(() => null)
  return res?.ok ? res.text() : null
}

export default async function handler(req, res) {
  const file = String(req.query.file ?? '')
  if (!FILES.has(file)) return res.status(404).json({ error: 'not found' })
  const body = (await fromBaum(file)) ?? (await fromFallback(file))
  if (!body) return res.status(502).json({ error: 'no data' })
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=3600')
  return res.status(200).send(body)
}
