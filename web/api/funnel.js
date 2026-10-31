// One step of the way in (src/lib/funnel.ts), passed to Baum with SLUGS' key. The
// signed-in person's Baum session goes with it, so Baum joins the visitor up with their
// account. Answers 204 whatever happens: the page never waits on this.
//
//   POST { visitor, event, ref?, path? }

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const EVENTS = new Set(['visit', 'invite_view', 'popup_open', 'post_click', 'link_sent', 'signin_click', 'signed_in', 'active'])

const cookieOf = (req, name) => (req.headers.cookie ?? '').match(new RegExp(`(?:^|;\\s*)${name}=([A-Za-z0-9_-]+)`))?.[1] ?? null

function bodyOf(req) {
  // sendBeacon's body can arrive as a string.
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return req.body ?? {}
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (req.method !== 'POST' || !process.env.BAUM_API_KEY) return res.status(204).end()
  const body = bodyOf(req)
  const visitor = typeof body.visitor === 'string' ? body.visitor : cookieOf(req, 'slugs_vid')
  const event = String(body.event ?? '')
  if (!visitor || !/^[A-Za-z0-9_-]{16,64}$/.test(visitor) || !EVENTS.has(event)) return res.status(204).end()

  const session = cookieOf(req, 'slugs_session')
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined)
  await fetch(`${BAUM}/api/partner/funnel`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.BAUM_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ visitor, event, ref: str(body.ref, 60), path: str(body.path, 200), ...(session ? { session } : {}) }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => null)
  return res.status(204).end()
}
