// Personal invitations: a link the owner makes on the admin page for one person, with
// a note, the bots suggested for them and the profiles their welcome tour shows. There
// is no database: everything rides in the link, signed so nobody can change it.
//
//   https://www.slugs.run/i/<payload>.<signature>
//
// The payload is base64url JSON; the signature an HMAC with INVITE_SECRET (or the
// server-only BAUM_API_KEY), under its own prefix so it can't be swapped with another
// signed thing on SLUGS.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const SITE = 'https://www.slugs.run'
export const LIMITS = { name: 40, note: 160, bots: 4, profiles: 8 }

const key = () => process.env.INVITE_SECRET || process.env.BAUM_API_KEY
const sign = (payload) => createHmac('sha256', key()).update(`slugs-invitation-v1:${payload}`).digest('base64url').slice(0, 32)

// Controls, zero-width, invisible and bidi characters (the same set as src/lib/untrusted.ts),
// built from code points so this file holds none of them.
const RANGES = [[0x0, 0x1f], [0x7f, 0x9f], [0xad], [0x61c], [0x115f, 0x1160], [0x180e], [0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2069], [0x3164], [0xfeff], [0xfff9, 0xfffb]]
const hex = (n) => n.toString(16).padStart(4, '0')
const HIDDEN = new RegExp(`[${RANGES.map(([a, b]) => (b ? `\\u${hex(a)}-\\u${hex(b)}` : `\\u${hex(a)}`)).join('')}]`, 'g')

/** One plain line of at most max characters. */
export const plain = (value, max) => [...String(value ?? '').replace(/\s+/g, ' ').replace(HIDDEN, '').replace(/ {2,}/g, ' ').trim()].slice(0, max).join('')

const BOT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const USER = /^[A-Za-z0-9_]{1,30}$/
const CODE = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/
const WALLET = /^0x[0-9a-f]{40}$/

/**
 * A clean invitation from the admin's form, or a sentence saying what's wrong. Short keys
 * keep the link short: to, handle, note, from, code, bots, profiles [{ u, a, w }].
 */
export function invitationFrom(input) {
  const to = plain(input?.to, LIMITS.name)
  if (!to) return 'Add their name.'
  const handle = plain(input?.handle, 31).replace(/^@/, '')
  if (handle && !USER.test(handle)) return 'Their @handle can only have letters, numbers and underscores.'
  const from = plain(input?.from, 30).replace(/^@/, '')
  if (!USER.test(from)) return 'Add who it’s from: a username.'
  const code = plain(input?.code, 40)
  if (!CODE.test(code)) return 'Add the invite code it uses, like GOOBZ.'
  const bots = [...new Set((Array.isArray(input?.bots) ? input.bots : []).map((bot) => plain(bot, 24).toLowerCase()))]
  if (bots.length > LIMITS.bots || bots.some((bot) => !BOT.test(bot))) return `Suggest up to ${LIMITS.bots} bots, named like dca-bot.`
  const profiles = Array.isArray(input?.profiles) ? input.profiles : []
  if (profiles.length > LIMITS.profiles) return `Show up to ${LIMITS.profiles} profiles.`
  const cleanProfiles = []
  for (const profile of profiles) {
    const u = plain(profile?.u, 30).replace(/^@/, '')
    const a = plain(profile?.a, 24).toLowerCase()
    const w = profile?.w ? String(profile.w).toLowerCase() : undefined
    if (!USER.test(u) || !BOT.test(a) || (w && !WALLET.test(w))) return `Check the profile ${u || '(no name)'}: a username, then a bot named like dca-bot.`
    cleanProfiles.push(w ? { u, a, w } : { u, a })
  }
  const note = plain(input?.note, LIMITS.note)
  return { v: 1, to, ...(handle ? { handle } : {}), ...(note ? { note } : {}), from, code, bots, profiles: cleanProfiles, at: Date.now() }
}

export function tokenFor(invitation) {
  const payload = Buffer.from(JSON.stringify(invitation)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** The invitation in a signed token, or null when it's malformed or was changed. */
export function invitationIn(token) {
  const [payload, signature] = String(token ?? '').split('.')
  if (!payload || !signature || payload.length > 4000 || !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{32}$/.test(signature)) return null
  const expected = Buffer.from(sign(payload))
  if (!timingSafeEqual(expected, Buffer.from(signature))) return null
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString())
    const again = invitationFrom(value)
    return typeof again === 'string' ? null : { ...again, at: Number.isFinite(value.at) ? value.at : again.at }
  } catch { return null }
}

export const linkFor = (token) => `${SITE}/i/${token}`
export const signingReady = () => Boolean(key())
