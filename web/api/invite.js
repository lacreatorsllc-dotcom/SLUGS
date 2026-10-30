// Invite links: slugs.run/<code>, where the code is somebody's Baum referral code.
//
// Opening one (or entering a code on the front page) checks the code with Baum, which
// counts the click, and gives the visitor a guest pass: an httpOnly cookie, signed here,
// good for 7 days from when it was given. With it they can use the site. To keep access
// they create their account on Baum (slug-join-<code> in Telegram); once they sign in,
// the pass no longer matters. When it runs out, they're back at the invite wall and
// enter a code again, which starts a new 7 days. Baum's side: lib/invite-links.ts.
//
//   POST { code }  check the code; a guest pass for a valid one
//   GET            the current pass, or 404

import { createHmac, timingSafeEqual } from 'node:crypto'

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const COOKIE = 'slugs_invite'
const DAYS = 7
const secret = () => process.env.INVITE_SECRET || process.env.BAUM_API_KEY

const sign = (payload) => createHmac('sha256', secret()).update(`slugs-invite:${payload}`).digest('base64url')

function passFrom(req) {
  const raw = (req.headers.cookie ?? '').match(/(?:^|;\s*)slugs_invite=([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/)?.[1]
  if (!raw || !secret()) return null
  const [payload, mac] = raw.split('.')
  const want = Buffer.from(sign(payload))
  const got = Buffer.from(mac)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null
  try {
    const pass = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof pass.code === 'string' && pass.expiresAt > Date.now() ? pass : null
  } catch {
    return null
  }
}

function setPass(res, pass) {
  const payload = Buffer.from(JSON.stringify(pass)).toString('base64url')
  const maxAge = Math.floor((pass.expiresAt - Date.now()) / 1000)
  res.setHeader('set-cookie', `${COOKIE}=${payload}.${sign(payload)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`)
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!secret()) return res.status(503).json({ reason: 'not-configured' })

  if (req.method === 'GET') {
    const pass = passFrom(req)
    return pass ? res.status(200).json(pass) : res.status(404).json({ reason: 'no-pass' })
  }
  if (req.method !== 'POST') return res.status(405).json({ reason: 'method' })

  const code = String(req.body?.code ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9-]{3,40}$/.test(code)) return res.status(400).json({ reason: 'bad-code' })
  // Already holding a pass for this code: same pass, no second click counted.
  const held = passFrom(req)
  if (held && held.code === code) return res.status(200).json(held)

  const answer = await fetch(`${BAUM}/api/partner/invite`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.BAUM_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  }).catch(() => null)
  const check = answer?.ok ? await answer.json().catch(() => null) : null
  if (!check) return res.status(502).json({ reason: 'baum-unavailable' })
  if (!check.valid) return res.status(404).json({ reason: 'unknown-code' })
  // SLUGS' own code isn't an invite: Baum asks people on it to apply.
  if (check.held) return res.status(403).json({ reason: 'apply' })

  // A pass's 7 days start when it's given; entering a code again starts a new one.
  // `code` is what they typed or opened (an alias stays an alias), for the link to Baum.
  const pass = { code, from: check.from ?? null, expiresAt: Date.now() + DAYS * 86_400_000 }
  setPass(res, pass)
  return res.status(200).json(pass)
}
