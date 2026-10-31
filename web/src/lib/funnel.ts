// Where people are on the way in: first visit, the invite wall, the shill popup, sign-in
// and daily use. Each browser gets a random visitor id (slugs_vid, a year), and each
// step is posted to api/funnel.js, which adds the Baum session when there is one so the
// visitor joins up with the account. Fire and forget: nothing waits on it.

export type FunnelEvent =
  | 'visit'
  | 'invite_view'
  | 'popup_open'
  | 'post_click'
  | 'link_sent'
  | 'signin_click'
  | 'signed_in'
  | 'active'

const COOKIE = 'slugs_vid'
const YEAR_S = 365 * 86_400

function newId(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function visitorId(): string | null {
  if (typeof document === 'undefined') return null
  const held = document.cookie.match(/(?:^|;\s*)slugs_vid=([A-Za-z0-9_-]{16,64})/)?.[1]
  if (held) return held
  const id = newId()
  document.cookie = `${COOKIE}=${id}; Path=/; Max-Age=${YEAR_S}; Secure; SameSite=Lax`
  return id
}

export function track(event: FunnelEvent, extra: { ref?: string } = {}): void {
  try {
    const visitor = visitorId()
    if (!visitor) return
    const body = JSON.stringify({ visitor, event, path: location.pathname, ...extra })
    const blob = new Blob([body], { type: 'application/json' })
    if (!navigator.sendBeacon?.('/api/funnel', blob)) {
      fetch('/api/funnel', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  } catch {
    // Never in the way of the page.
  }
}

/** "active" once a day per browser while signed in. */
export function trackActiveToday(): void {
  const today = new Date().toISOString().slice(0, 10)
  try {
    if (localStorage.getItem('slugs.active') === today) return
    localStorage.setItem('slugs.active', today)
  } catch {
    // No storage to remember the day: count it anyway.
  }
  track('active')
}
