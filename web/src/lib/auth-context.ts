import { createContext, useContext } from 'react'
import type { GuestPass } from './invite'

// SLUGS signs people in with Baum: this is what Baum shares about the signed-in
// person (GET /api/partner/me on Baum, through api/session.js).
export type BaumProfile = {
  username: string | null
  /** The EVM wallets Baum holds for them, the default first: their agents on the leaderboard. */
  wallets: string[]
  strategy: { id: string; name: string } | null
  copy: {
    status: 'draft' | 'active' | 'paused'
    sources: { label: string; ref: string; sizing: string }[]
    perTradeUsd: number
    dailyUsd: number
  } | null
  /** Their referral codes, with how often each invite link was opened and how many accounts came through it. */
  invites?: { code: string; aliases: string[]; clicks: number; accounts: number }[]
  /** Their profile picture on Baum, or null for initials. */
  avatarUrl?: string | null
  /** The AI agents they launched in Baum, running ones first. Listed before they trade. */
  agents?: { name: string; slug: string | null; wallet: string; status: 'active' | 'stopped' }[]
}

export type AuthSession = {
  user: BaumProfile | null
  /** A guest from an invite link, for 7 days, until they make their account on Baum. */
  guest: GuestPass | null
  ready: boolean
  error: boolean
  retry: () => void
  /** Reads the profile again in place, after a change like a new username. */
  refresh: () => Promise<void>
  /** Trades the one-time code from Baum's sign-in button for a session. */
  signIn: (code: string) => Promise<void>
  signOut: () => Promise<void>
  /** Checks an invite code and, for a real one, lets this browser in as a guest. */
  acceptInvite: (code: string) => Promise<GuestPass>
}
export const AuthContext = createContext<AuthSession | null>(null)

export function useAuthSession() {
  const session = useContext(AuthContext)
  if (!session) throw new Error('AuthSessionProvider is missing')
  return session
}
