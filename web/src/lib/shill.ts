// "Shill us on X": somebody without an invite code posts about SLUGS, sends us the
// link, and waits in SLUGS' line. An admin reads each post and ticks what it did; every
// approved post is in the daily draw with at least one ticket, and each boost adds
// more, so doing the minimum still has a chance (api/apply.js, the admin page).
// Pure, so it tests without the app's config: the X handle is passed in (BRAND.x).

export type Boosts = { why: string; friend: string; friendWhy: string }

// The same ticket counts the admin's checkboxes use.
export const BOOSTS = [
  { key: 'why', label: 'Say why you want access', tickets: 1 },
  { key: 'friend', label: 'Tag a friend', tickets: 2 },
  { key: 'friendWhy', label: 'Say why that friend should use SLUGS', tickets: 2 },
] as const

export const BASE_TICKETS = 1

/** A friend's X handle as typed: "@name", "name" or an x.com link. Empty when it isn't one. */
export function handleFrom(raw: string): string {
  const t = raw.trim().replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, '').replace(/^@/, '').replace(/[/?].*$/, '')
  return /^[A-Za-z0-9_]{1,15}$/.test(t) ? t : ''
}

/** The tickets their post would earn if an admin sees every boost in it. */
export function ticketsFor(b: Boosts): number {
  const friend = handleFrom(b.friend)
  return BASE_TICKETS + (b.why.trim() ? 1 : 0) + (friend ? 2 : 0) + (friend && b.friendWhy.trim() ? 2 : 0)
}

/** The post, as X will show it. Always tags SLUGS (`xHandle`) and links the site. */
export function shillPost(b: Boosts, xHandle: string): string {
  const why = b.why.trim()
  const friend = handleFrom(b.friend)
  const friendWhy = b.friendWhy.trim()
  const lines = [`Hey @${xHandle} I want access to SLUGS${why ? `: ${why}` : '.'}`]
  if (friend) lines.push(`@${friend} ${friendWhy || 'come with me.'}`)
  lines.push('slugs.run')
  return lines.join('\n\n')
}

export const postIntent = (text: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`

/** A link to one post on X, normalised to x.com, or null. */
export function postUrlFrom(raw: string): string | null {
  const m = /^\s*(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{1,25})/i.exec(raw)
  return m ? `https://x.com/${m[1]}/status/${m[2]}` : null
}

/** A Telegram username as typed ("@name", "name", t.me/name), or empty. */
export function telegramFrom(raw: string): string {
  const t = raw.trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '')
  return /^[A-Za-z0-9_]{5,32}$/.test(t) ? t : ''
}

export const looksLikeEmail = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim())
