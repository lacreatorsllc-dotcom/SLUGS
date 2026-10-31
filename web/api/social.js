// SLUGS-only social data: who follows whom, and display names. Baum keeps accounts,
// usernames and pictures; this keeps what's SLUGS' own, keyed to the Baum account's
// wallet (it never changes, unlike a username), in a Redis store from Vercel's
// Upstash integration (KV_REST_API_URL / KV_REST_API_TOKEN). Without one it answers
// 503 not-configured and the site hides follows.
//
//   GET  ?wallet=0x…                              counts, display name, and whether you follow it
//   GET  ?wallet=0x…&list=followers|following     the people, newest first
//   POST { action: 'follow' | 'unfollow', wallet }
//   POST { action: 'display-name', name }         '' clears it

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const STORE = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const STORE_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
const ADDRESS = /^0x[0-9a-f]{40}$/
const MAX_LIST = 500
export const MAX_NAME = 32

const sessionFrom = (req) => (req.headers.cookie ?? '').match(/(?:^|;\s*)slugs_session=([A-Za-z0-9_-]+)/)?.[1] ?? null
const keys = {
  followers: (wallet) => `followers:${wallet}`, // sorted set: follower wallet → when
  following: (wallet) => `following:${wallet}`,
  name: (wallet) => `name:${wallet}`,
  person: (wallet) => `person:${wallet}`, // { username, avatarUrl } from Baum, for lists
}

/** Runs Redis commands in one round trip; answers their results in order. */
async function redis(...commands) {
  const res = await fetch(`${STORE}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${STORE_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`store ${res.status}`)
  const answers = await res.json()
  return answers.map((answer) => { if (answer.error) throw new Error(answer.error); return answer.result })
}

/** The signed-in person's wallet, username and picture, from Baum; null when signed out. */
async function me(req) {
  const session = sessionFrom(req)
  if (!session) return null
  const res = await fetch(`${BAUM}/api/partner/me`, {
    headers: { authorization: `Bearer ${process.env.BAUM_API_KEY}`, 'x-baum-session': session },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!res?.ok) return null
  const profile = await res.json().catch(() => null)
  const wallet = String(profile?.wallets?.[0] ?? '').toLowerCase()
  return ADDRESS.test(wallet) ? { wallet, username: profile.username ?? null, avatarUrl: profile.avatarUrl ?? null } : null
}

/** Trims a display name and takes out control characters; null when it's too long. */
export function cleanName(value) {
  const name = String(value ?? '').replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, '').replace(/\s+/g, ' ').trim()
  return [...name].length > MAX_NAME ? null : name
}

async function summary(req, wallet) {
  const viewer = sessionFrom(req) ? await me(req) : null
  const [followers, following, name, youFollow] = await redis(
    ['ZCARD', keys.followers(wallet)],
    ['ZCARD', keys.following(wallet)],
    ['GET', keys.name(wallet)],
    ['ZSCORE', keys.followers(wallet), viewer?.wallet ?? '-'],
  )
  return { followers, following, displayName: name ?? null, youFollow: youFollow !== null, you: viewer?.wallet ?? null }
}

async function list(wallet, which) {
  const wallets = await redis(['ZREVRANGE', keys[which](wallet), 0, MAX_LIST - 1]).then(([found]) => found)
  if (!wallets.length) return []
  const details = await redis(...wallets.flatMap((other) => [['GET', keys.person(other)], ['GET', keys.name(other)]]))
  return wallets.map((other, index) => {
    const person = JSON.parse(details[index * 2] ?? 'null') ?? {}
    return { wallet: other, username: person.username ?? null, avatarUrl: person.avatarUrl ?? null, displayName: details[index * 2 + 1] ?? null }
  })
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!STORE || !STORE_TOKEN) return res.status(503).json({ reason: 'not-configured' })
  try {
    if (req.method === 'GET') {
      const wallet = String(req.query?.wallet ?? '').toLowerCase()
      if (!ADDRESS.test(wallet)) return res.status(400).json({ reason: 'bad-wallet' })
      const which = req.query?.list
      if (which === undefined) return res.status(200).json(await summary(req, wallet))
      if (which !== 'followers' && which !== 'following') return res.status(400).json({ reason: 'bad-list' })
      return res.status(200).json({ people: await list(wallet, which) })
    }
    if (req.method !== 'POST') return res.status(405).json({ reason: 'method' })
    const body = req.body ?? {}
    const viewer = await me(req)
    if (!viewer) return res.status(401).json({ reason: 'signed-out' })
    const remember = ['SET', keys.person(viewer.wallet), JSON.stringify({ username: viewer.username, avatarUrl: viewer.avatarUrl })]

    if (body.action === 'follow' || body.action === 'unfollow') {
      const target = String(body.wallet ?? '').toLowerCase()
      if (!ADDRESS.test(target)) return res.status(400).json({ reason: 'bad-wallet' })
      if (target === viewer.wallet) return res.status(400).json({ reason: 'You can’t follow yourself.' })
      if (body.action === 'follow') await redis(remember, ['ZADD', keys.following(viewer.wallet), Date.now(), target], ['ZADD', keys.followers(target), Date.now(), viewer.wallet])
      else await redis(['ZREM', keys.following(viewer.wallet), target], ['ZREM', keys.followers(target), viewer.wallet])
      return res.status(200).json(await summary(req, target))
    }
    if (body.action === 'display-name') {
      const name = cleanName(body.name)
      if (name === null) return res.status(400).json({ reason: `Keep it to ${MAX_NAME} characters.` })
      await redis(remember, name ? ['SET', keys.name(viewer.wallet), name] : ['DEL', keys.name(viewer.wallet)])
      return res.status(200).json({ displayName: name || null })
    }
    return res.status(404).json({ reason: 'unknown-action' })
  } catch (error) {
    console.warn('social:', error?.message)
    return res.status(502).json({ reason: 'store-unavailable' })
  }
}
