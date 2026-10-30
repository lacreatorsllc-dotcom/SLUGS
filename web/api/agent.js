// One AI agent from Baum, by slug or wallet (/api/agent?id=frank-oak), for an agent
// that isn't on the leaderboards yet: one just launched and funded hasn't traded, and
// Baum has just sent its creator the link to its page here. Agents on the boards come
// from api/data.js. The partner key stays on the server; Baum doesn't charge for this.

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const ID = /^(?:0x[0-9a-f]{40}|[a-z0-9]+(?:-[a-z0-9]+)+)$/

export default async function handler(req, res) {
  const id = String(req.query.id ?? '').trim().toLowerCase()
  if (!ID.test(id)) return res.status(400).json({ reason: 'bad-id' })
  const key = process.env.BAUM_API_KEY
  if (!key) return res.status(503).json({ reason: 'not-configured' })
  const answer = await fetch(`${BAUM}/api/partner/agent?id=${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${key}` },
  }).catch(() => null)
  if (answer?.status === 404) {
    res.setHeader('cache-control', 'public, max-age=60, s-maxage=60')
    return res.status(404).json({ reason: 'not-found' })
  }
  if (!answer?.ok) return res.status(502).json({ reason: 'baum-unavailable' })
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'public, max-age=60, s-maxage=300')
  return res.status(200).send(await answer.text())
}
