// Signing in with Baum. A SLUGS account sits on a Baum account, and every Baum account
// lives in Telegram, so that's where sign-in happens: the "Log in with Baum" button
// opens the bot on atp-login-<code>, and Baum answers with a button back to
// /connect-baum?code=<one-time code>. That page posts the code here, this trades it
// with SLUGS' partner key for a Baum session (POST /api/partner/session on Baum), and
// keeps the session in an httpOnly cookie, so neither the key nor the session ever
// reaches page scripts. Baum's side: baum-monorepo lib/partner-profile.ts.
//
//   POST   { code }  sign in; answers with the profile
//   GET              the signed-in profile, or 401
//   DELETE           sign out

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const COOKIE = 'slugs_session'
const MAX_AGE = 30 * 86_400 // Baum's sessions last 30 days

const sessionFrom = (req) => (req.headers.cookie ?? '').match(/(?:^|;\s*)slugs_session=([A-Za-z0-9_-]+)/)?.[1] ?? null

function setCookie(res, value, maxAge) {
  res.setHeader('set-cookie', `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`)
}

function baum(method, path, { session, body } = {}) {
  return fetch(`${BAUM}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.BAUM_API_KEY}`,
      'content-type': 'application/json',
      ...(session ? { 'x-baum-session': session } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  })
}

async function signIn(req, res) {
  const code = req.body?.code
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(code)) return res.status(400).json({ reason: 'bad-code' })
  const answer = await baum('POST', '/api/partner/session', { body: { code } })
  if (answer.status === 400 || answer.status === 410) return res.status(answer.status).json({ reason: 'expired-code' })
  if (!answer.ok) {
    console.warn(`sign-in: Baum answered ${answer.status}`)
    return res.status(502).json({ reason: 'baum-unavailable' })
  }
  const { session, profile } = await answer.json()
  setCookie(res, session, MAX_AGE)
  return res.status(200).json(profile)
}

async function profile(req, res) {
  const session = sessionFrom(req)
  if (!session) return res.status(401).json({ reason: 'signed-out' })
  const answer = await baum('GET', '/api/partner/me', { session })
  if (answer.status === 401) {
    setCookie(res, '', 0)
    return res.status(401).json({ reason: 'signed-out' })
  }
  if (!answer.ok) {
    console.warn(`profile: Baum answered ${answer.status}`)
    return res.status(502).json({ reason: 'baum-unavailable' })
  }
  return res.status(200).json(await answer.json())
}

async function signOut(req, res) {
  const session = sessionFrom(req)
  // Signed out here either way; Baum forgets the session when it can.
  if (session) await baum('DELETE', '/api/partner/session', { session }).catch(() => null)
  setCookie(res, '', 0)
  return res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!process.env.BAUM_API_KEY) return res.status(503).json({ reason: 'not-configured' })
  try {
    if (req.method === 'POST') return await signIn(req, res)
    if (req.method === 'GET') return await profile(req, res)
    if (req.method === 'DELETE') return await signOut(req, res)
    res.setHeader('allow', 'GET, POST, DELETE')
    return res.status(405).json({ reason: 'method' })
  } catch (err) {
    console.warn(`session: ${err}`)
    return res.status(502).json({ reason: 'baum-unavailable' })
  }
}
