import type { BaumProfile } from './auth-context'
import type { GuestPass } from './invite'

// The welcome tour shows once per account in each browser. A Baum account is keyed by its
// username (or default wallet); a guest by the invite they came in on, so making the account
// later shows the tour's last card again with their own slug.

const seenThisVisit = new Set<string>()
const PREFIX = 'slugs.welcomed:'

// Accounts that get every new-user card on each visit, as if they'd just signed up, so
// the owner can check them: goobz by default, or a comma-separated
// VITE_PREVIEW_ACCOUNTS. Any card for new users should ask previewsNewUserCards.
const PREVIEW = new Set(String(import.meta.env?.VITE_PREVIEW_ACCOUNTS ?? 'goobz').split(',').map((name) => name.trim().toLowerCase()).filter(Boolean))

export const previewsNewUserCards = (user: Pick<BaumProfile, 'username'> | null) => Boolean(user?.username && PREVIEW.has(user.username.toLowerCase()))
const isPreview = (key: string) => PREVIEW.has(key.slice(PREFIX.length))

export function welcomeKey(user: BaumProfile | null, guest: GuestPass | null): string | null {
  if (user) {
    const id = user.username?.toLowerCase() || user.wallets[0]?.toLowerCase()
    return id ? `${PREFIX}${id}` : null
  }
  return guest ? `${PREFIX}guest:${guest.code.toLowerCase()}` : null
}

export function hasSeenWelcome(key: string) {
  if (seenThisVisit.has(key)) return true
  // A preview account sees it again on its next visit, whatever this browser remembers.
  if (isPreview(key)) return false
  try { return localStorage.getItem(key) === '1' } catch { return false }
}

export function markWelcomeSeen(key: string) {
  seenThisVisit.add(key)
  if (isPreview(key)) return
  try { localStorage.setItem(key, '1') } catch { /* storage blocked: it stays seen for this visit only */ }
}
