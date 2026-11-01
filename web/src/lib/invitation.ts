// A personal invitation from the owner (server/invitation.js): who it's for, a note, the
// bots suggested for them and the profiles their welcome tour shows. It arrives as a
// signed link; once the server checks it, it's kept in this browser so the tour and the
// Deploy page can use it.

export type InvitationProfile = { u: string; a: string; w?: string }
export type Invitation = { v: 1; to: string; handle?: string; note?: string; from: string; code: string; bots: string[]; profiles: InvitationProfile[]; at: number }

const KEY = 'slugs.invitation'
const api = (path: string) => `${import.meta.env.BASE_URL}api/${path}`

// Pictures for the regular example profiles, shipped with the site (public/welcome).
export const GOOBZ_WALLET = '0xf6414c58f65b106232871c0d566c417054ef6b92'
export const PICTURES: Record<string, string> = {
  brokentyrant: 'welcome/brokentyrant.jpg',
  brazylord: 'welcome/brazylord.jpg',
  bagcalls: 'welcome/bagcalls.jpg',
  meechi: 'welcome/meechi.jpg',
  fwaz: 'welcome/fwaz.jpg',
  '12g8ge': 'welcome/12g8ge.jpg',
}
const WALLETS: Record<string, string> = { goobz: GOOBZ_WALLET }

/** The welcome tour's examples when there's no personal invitation. */
export const DEFAULT_PROFILES: InvitationProfile[] = [
  { u: 'brokentyrant', a: 'sniper-bot' }, { u: 'brazylord', a: 'gold-trader' },
  { u: 'bagcalls', a: 'hodl-bot' }, { u: 'meechi', a: 'market-maker' }, { u: 'fwaz', a: 'dev-bot' }, { u: '12g8ge', a: 'mev-bot' },
]

/** Bots the owner can suggest. Others can be typed in. */
export const BOT_CATALOG = ['dca-bot', 'hodl-bot', 'sniper-bot', 'spot-trader', 'copy-trader', 'scalper-bot', 'momentum-bot', 'grid-bot', 'gold-trader', 'market-maker', 'dev-bot', 'mev-bot']

/** A profile's picture: the one shipped with the site, else Baum's for its wallet. */
export function pictureOf(profile: InvitationProfile): string | null {
  const file = PICTURES[profile.u.toLowerCase()]
  if (file) return `${import.meta.env.BASE_URL}${file}`
  const wallet = profile.w ?? WALLETS[profile.u.toLowerCase()]
  return wallet ? `https://baumai.xyz/api/avatar/${wallet}` : null
}

export function savedInvitation(): Invitation | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return value && value.v === 1 && Array.isArray(value.profiles) && Array.isArray(value.bots) ? value : null
  } catch { return null }
}

function save(invitation: Invitation) {
  try { localStorage.setItem(KEY, JSON.stringify(invitation)) } catch { /* storage blocked: the tour shows the usual examples */ }
}

/** Checks a token with the server and keeps the invitation; null when it isn't valid. */
export async function openInvitation(token: string): Promise<Invitation | null> {
  const res = await fetch(api(`invitation?token=${encodeURIComponent(token)}`)).catch(() => null)
  const json = res?.ok ? await res.json().catch(() => null) : null
  const invitation = json?.invitation as Invitation | undefined
  if (!invitation) return null
  save(invitation)
  return invitation
}

export const cardUrl = (token: string, download = false) => api(`invitation?token=${encodeURIComponent(token)}&format=image${download ? '&download=1' : ''}`)
