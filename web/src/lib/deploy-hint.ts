import type { BaumProfile } from './auth-context'
import { markTourSeen, shouldShowTour } from './tour.ts'
import { hasSeenWelcome, welcomeKey } from './welcome.ts'

// A wallet keeps this hint tied to the same account even after a username change.
export function deployHintKey(user: BaumProfile | null): string | null {
  const id = user?.wallets[0]?.toLowerCase() || user?.username?.toLowerCase()
  return id ? `deploy-entry:${id}` : null
}

export function shouldShowDeployHint(user: BaumProfile | null, welcomeOpen: boolean, pathname: string): boolean {
  const key = deployHintKey(user)
  const welcomed = welcomeKey(user, null)
  return Boolean(key && welcomed && !welcomeOpen && pathname !== '/deploy' && hasSeenWelcome(welcomed) && shouldShowTour(key, user))
}

export function markDeployHintSeen(user: BaumProfile | null) {
  const key = deployHintKey(user)
  if (key) markTourSeen(key)
}
