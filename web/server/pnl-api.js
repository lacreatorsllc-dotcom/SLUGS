import { createHmac, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { Resvg } from '@resvg/resvg-js'
import { escapeXml, renderPnlCard, STYLES } from './pnl-card.js'

const SITE = 'https://www.slugs.run'
const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const ADDRESS = /^0x[0-9a-f]{40}$/
const key = () => process.env.PNL_SHARE_SECRET || process.env.BAUM_API_KEY
const signature = (card) => createHmac('sha256', key()).update(`slugs-pnl-v1:${card}`).digest('hex')
const clean = (text, max = 48) => [...String(text ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e]/g, '')].slice(0, max).join('')

function signedCard(req) {
  const card = String(req.query.card ?? '')
  const sig = String(req.query.sig ?? '')
  if (!card || card.length > 3000 || !/^[A-Za-z0-9_-]+$/.test(card) || !/^[a-f0-9]{64}$/.test(sig)) return null
  if (!timingSafeEqual(Buffer.from(signature(card), 'hex'), Buffer.from(sig, 'hex'))) return null
  try {
    const value = JSON.parse(Buffer.from(card, 'base64url').toString())
    if (!ADDRESS.test(value.wallet) || !['24h', '7d', 'all'].includes(value.range)
      || ![value.pnlUsd, value.volumeUsd, value.trades, value.updatedAt].every(Number.isFinite)
      || value.volumeUsd < 0 || !Number.isInteger(value.trades) || value.trades < 0
      || typeof value.name !== 'string' || value.name.length > 96 || !/^[A-Za-z0-9_-]{1,40}$/.test(value.ref)) return null
    return value
  } catch { return null }
}

async function capture(req, res) {
  const wallet = String(req.body?.wallet ?? '').toLowerCase()
  const range = String(req.body?.range ?? '7d')
  if (!ADDRESS.test(wallet) || !['24h', '7d', 'all'].includes(range)) return res.status(400).json({ reason: 'Invalid agent or time range.' })
  const answer = await fetch(`${SITE}/data/leaderboard-${range}.json`, { signal: AbortSignal.timeout(10000) })
  if (!answer.ok) return res.status(502).json({ reason: 'Couldn’t load this agent’s performance. Try again.' })
  const feed = await answer.json()
  const row = feed.rows?.find((item) => item.wallet?.toLowerCase() === wallet)
  if (!row || ![row.pnlUsd, row.volumeUsd, row.trades].every(Number.isFinite)) return res.status(404).json({ reason: 'No reported performance for this agent and time range.' })
  let profile = null
  const session = (req.headers.cookie ?? '').match(/(?:^|;\s*)slugs_session=([A-Za-z0-9_-]+)/)?.[1]
  if (session && process.env.BAUM_API_KEY) {
    const me = await fetch(`${BAUM}/api/partner/me`, { headers: { authorization: `Bearer ${process.env.BAUM_API_KEY}`, 'x-baum-session': session }, signal: AbortSignal.timeout(8000) }).catch(() => null)
    if (me?.ok) profile = await me.json().catch(() => null)
  }
  const own = profile?.wallets?.some((item) => item.toLowerCase() === wallet)
  const invite = profile?.invites?.[0]
  const referral = String(invite?.aliases?.[0] || invite?.code || process.env.VITE_BAUM_REF || 'SLUGS')
  const snapshot = {
    wallet, range, name: clean(own && profile.username ? `@${profile.username.replace(/^@/, '')}` : row.username ? `@${row.username.replace(/^@/, '')}` : `${wallet.slice(0, 6)}…${wallet.slice(-4)}`),
    pnlUsd: row.pnlUsd, volumeUsd: row.volumeUsd, trades: row.trades,
    avatarUrl: own ? profile.avatarUrl ?? row.avatarUrl ?? null : row.avatarUrl ?? null,
    ref: /^[A-Za-z0-9_-]{1,40}$/.test(referral) ? referral : 'SLUGS',
    updatedAt: Number.isFinite(feed.updatedAt) ? feed.updatedAt : Date.now(), capturedAt: Date.now(),
  }
  const card = Buffer.from(JSON.stringify(snapshot)).toString('base64url')
  return res.status(200).json({ card, sig: signature(card), snapshot })
}

// Only Baum's known public avatar route is fetched; a card cannot be used as a URL proxy.
async function picture(url) {
  if (typeof url !== 'string') return null
  let avatar
  try { avatar = new URL(url) } catch { return null }
  if (avatar.origin !== 'https://baumai.xyz' || !/^\/api\/avatar\/0x[0-9a-f]{40}$/i.test(avatar.pathname)) return null
  try {
    const response = await fetch(avatar, { redirect: 'error', signal: AbortSignal.timeout(8000) })
    const type = response.headers.get('content-type')?.split(';')[0]
    if (!response.ok || !['image/png', 'image/jpeg', 'image/webp'].includes(type)) return null
    let size = 0
    const chunks = []
    for await (const chunk of response.body) {
      size += chunk.length
      if (size > 3 * 1024 * 1024) return null
      chunks.push(chunk)
    }
    return `data:${type};base64,${Buffer.concat(chunks).toString('base64')}`
  } catch { return null }
}

let resources
function assets() {
  resources ??= Promise.all(['Inter-Regular.ttf', 'Inter-Bold.ttf', 'slugs-logo-orange.png'].map((file) => readFile(new URL(`../server-assets/${file}`, import.meta.url))))
  return resources
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!key()) return res.status(503).json({ reason: 'Card sharing is temporarily unavailable.' })
  try {
    if (req.method === 'POST') return await capture(req, res)
    if (req.method !== 'GET') { res.setHeader('allow', 'GET, POST'); return res.status(405).end() }
    const snapshot = signedCard(req)
    const style = String(req.query.style ?? 'classic')
    if (!snapshot || !STYLES.includes(style)) return res.status(400).json({ reason: 'This card link is invalid.' })
    const query = new URLSearchParams({ card: String(req.query.card), sig: String(req.query.sig), style })
    const image = `${SITE}/api/pnl?${query}&format=image`
    const page = `${SITE}/share/pnl?${query}`
    if (req.query.format === 'image') {
      const [[regular, bold, logo], avatar] = await Promise.all([assets(), picture(snapshot.avatarUrl)])
      const svg = renderPnlCard(snapshot, style, { logo: `data:image/png;base64,${logo.toString('base64')}`, avatar })
      const png = new Resvg(svg, { font: { fontBuffers: [regular, bold], loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng()
      res.setHeader('content-type', 'image/png')
      res.setHeader('cache-control', 'public, max-age=86400, s-maxage=86400')
      res.setHeader('content-disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="slugs-pnl-${style}-${snapshot.range}.png"`)
      return res.status(200).send(png)
    }
    const title = `${snapshot.name} · ${snapshot.range === 'all' ? 'All time' : snapshot.range.toUpperCase()} PnL on SLUGS`
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.setHeader('cache-control', 'public, max-age=300, s-maxage=3600')
    return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeXml(title)}</title><meta property="og:title" content="${escapeXml(title)}"><meta property="og:type" content="website"><meta property="og:url" content="${escapeXml(page)}"><meta property="og:image" content="${escapeXml(image)}"><meta property="og:image:width" content="1080"><meta property="og:image:height" content="1080"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@slugsrun"><meta name="twitter:title" content="${escapeXml(title)}"><meta name="twitter:image" content="${escapeXml(image)}"><meta name="twitter:image:alt" content="${escapeXml(title)}"><meta name="robots" content="noindex"><style>body{margin:0;background:#0b0b0a;color:#f5f3ee;font:16px system-ui,sans-serif;display:flex;min-height:100dvh;align-items:center;justify-content:center}main{max-width:680px;padding:24px;text-align:center}img{display:block;width:100%;height:auto;border-radius:18px}a{display:inline-block;margin:16px 8px;padding:12px 18px;background:#ece9e2;color:#0b0b0a;border-radius:10px;text-decoration:none}p{color:#b8b5ad;font-size:13px}</style></head><body><main><img src="${escapeXml(image)}" alt="${escapeXml(title)}" width="1080" height="1080"><a href="/agents/${snapshot.wallet}">Track this agent on SLUGS</a><a href="/${escapeXml(snapshot.ref)}">Join SLUGS</a><p>Reported Baum performance · snapshot ${escapeXml(new Date(snapshot.updatedAt).toISOString())}. Past performance does not predict future results.</p></main></body></html>`)
  } catch (error) {
    console.warn('pnl:', error?.message)
    return res.status(502).json({ reason: 'Couldn’t prepare the card. Try again.' })
  }
}
