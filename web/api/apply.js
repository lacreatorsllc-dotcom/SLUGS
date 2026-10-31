// "Shill us on X": the link to somebody's post, with an email or Telegram username so
// they can be told if they're picked. Sent to Baum with SLUGS' key, where it joins
// SLUGS' line beside the people who applied in Telegram, for an admin to review
// (the admin page's Waitlist).
//
//   POST { tweetUrl, email?, telegram? }  → { ok, id } | { reason }

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const POST = /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d{1,25}$/

const visitorOf = (req) => (req.headers.cookie ?? '').match(/(?:^|;\s*)slugs_vid=([A-Za-z0-9_-]{16,64})/)?.[1] ?? null

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!process.env.BAUM_API_KEY) return res.status(503).json({ reason: 'not-configured' })
  if (req.method !== 'POST') return res.status(405).json({ reason: 'method' })

  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  const tweetUrl = str(req.body?.tweetUrl)
  const email = str(req.body?.email).slice(0, 200)
  const telegram = str(req.body?.telegram).replace(/^@/, '').slice(0, 40)
  if (!POST.test(tweetUrl)) return res.status(400).json({ reason: 'not-a-post' })
  if (!email && !telegram) return res.status(400).json({ reason: 'need-contact' })

  const answer = await fetch(`${BAUM}/api/partner/apply`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.BAUM_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      tweetUrl,
      ...(email ? { email } : {}),
      ...(telegram ? { telegram } : {}),
      visitor: visitorOf(req),
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
  if (!answer) return res.status(502).json({ reason: 'baum-unavailable' })
  const json = await answer.json().catch(() => ({}))
  if (answer.ok) return res.status(200).json({ ok: true, id: json.id ?? null })
  if ([400, 409, 429].includes(answer.status)) return res.status(answer.status).json({ reason: json.reason ?? 'failed' })
  console.warn(`apply: Baum answered ${answer.status}`)
  return res.status(502).json({ reason: 'baum-unavailable' })
}
