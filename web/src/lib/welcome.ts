import type { BaumProfile } from './auth-context'
import type { GuestPass } from './invite'

// The welcome tour shows once per account in each browser. A Baum account is keyed by its
// username (or default wallet); a guest by the invite they came in on, so making the account
// later shows the tour's last card again with their own slug.

const seenThisVisit = new Set<string>()

export function welcomeKey(user: BaumProfile | null, guest: GuestPass | null): string | null {
  if (user) {
    const id = user.username?.toLowerCase() || user.wallets[0]?.toLowerCase()
    return id ? `slugs.welcomed:${id}` : null
  }
  return guest ? `slugs.welcomed:guest:${guest.code.toLowerCase()}` : null
}

export function hasSeenWelcome(key: string) {
  if (seenThisVisit.has(key)) return true
  try { return localStorage.getItem(key) === '1' } catch { return false }
}

export function markWelcomeSeen(key: string) {
  seenThisVisit.add(key)
  try { localStorage.setItem(key, '1') } catch { /* storage blocked: it stays seen for this visit only */ }
}
