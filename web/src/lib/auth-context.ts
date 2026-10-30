import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'

export type AuthSession = {
  user: User | null
  ready: boolean
  error: boolean
  retry: () => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}
export const AuthContext = createContext<AuthSession | null>(null)

export function useAuthSession() {
  const session = useContext(AuthContext)
  if (!session) throw new Error('AuthSessionProvider is missing')
  return session
}
