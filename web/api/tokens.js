// A wallet's tokens for the Tokens section on profiles and agent pages.
//
//   GET ?wallet=0x…&kind=launched|traded
//
// From Baum's partner endpoint asked for in docs/handoffs/2026-10-30-baum-tokens-request.md;
// until Baum ships it this answers { tokens: [], pending: true } and the site says so.

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const ADDRESS = /^0x[0-9a-f]{40}$/i

async function baum(path, kind) {
  const key = process.env.BAUM_API_KEY
  if (!key) return { pending: true }
  const res = await fetch(`${BAUM}${path}`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) }).catch(() => null)
  if (!res || res.status === 404) return { pending: true }
  if (!res.ok) return { error: res.status }
  const json = await res.json().catch(() => null)
  // The request asks for { launched: [...], traded: [...] }; a plain { tokens } works too.
  const rows = json?.[kind] ?? json?.tokens
  return Array.isArray(rows) ? { tokens: rows } : { error: 502 }
}

export default async function handler(req, res) {
  const { wallet, kind } = req.query ?? {}
  const send = (status, body) => {
    res.setHeader('cache-control', 'public, max-age=30, s-maxage=300, stale-while-revalidate=600')
    return res.status(status).json(body)
  }
  if (typeof wallet !== 'string' || !ADDRESS.test(wallet) || !['launched', 'traded'].includes(kind)) return send(400, { reason: 'bad-wallet' })
  const found = await baum(`/api/partner/wallet/tokens?wallet=${wallet.toLowerCase()}&kind=${kind}`, kind)
  return found.error ? send(502, { reason: 'baum-unavailable' }) : send(200, { tokens: found.tokens ?? [], pending: Boolean(found.pending) })
}
