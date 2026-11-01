import type { BaumProfile } from './auth-context'
import { previewsNewUserCards } from './welcome.ts'

// Whether someone has seen a page's first-time walkthrough (components/terminal/Coachmarks).
// Kept per browser; the owner's preview accounts see it on every visit, like the welcome tour.

const seenThisVisit = new Set<string>()
const key = (name: string) => `slugs.tour.${name}`

export function shouldShowTour(name: string, user: Pick<BaumProfile, 'username'> | null) {
  if (seenThisVisit.has(name)) return false
  if (previewsNewUserCards(user)) return true
  try { return localStorage.getItem(key(name)) !== '1' } catch { return true }
}

export function markTourSeen(name: string) {
  seenThisVisit.add(name)
  try { localStorage.setItem(key(name), '1') } catch { /* seen for this visit only */ }
}
