import { createContext, useContext } from 'react'

// A SLUGS account is a Baum account: this is what Baum shares about the signed-in
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
}

export type AuthSession = {
  user: BaumProfile | null
  ready: boolean
  error: boolean
  retry: () => void
  /** Trades the one-time code from Baum's sign-in button for a session. */
  signIn: (code: string) => Promise<void>
  signOut: () => Promise<void>
}
export const AuthContext = createContext<AuthSession | null>(null)

export function useAuthSession() {
  const session = useContext(AuthContext)
  if (!session) throw new Error('AuthSessionProvider is missing')
  return session
}
