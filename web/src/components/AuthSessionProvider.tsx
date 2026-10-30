import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { AuthContext } from '../lib/auth-context'

export default function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User | null; ready: boolean; error: boolean }>({ user: null, ready: false, error: false })
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    setState((previous) => ({ ...previous, ready: false, error: false }))
    // Auth loads separately so the invite page can paint its existing design immediately.
    import('../lib/auth').then(({ observeAuth }) => {
      if (!active) return
      unsubscribe = observeAuth(
        (user) => { if (active) setState({ user, ready: true, error: false }) },
        () => { if (active) setState({ user: null, ready: true, error: true }) },
      )
    }).catch(() => { if (active) setState({ user: null, ready: true, error: true }) })
    return () => { active = false; unsubscribe?.() }
  }, [revision])
  const signIn = useCallback(async (email: string, password: string) => {
    const auth = await import('../lib/auth')
    const credential = await auth.signIn(email, password)
    setState({ user: credential.user, ready: true, error: false })
  }, [])
  const signOut = useCallback(async () => {
    const { endSession } = await import('../lib/auth')
    await endSession()
    setState({ user: null, ready: true, error: false })
  }, [])
  return <AuthContext.Provider value={{ ...state, retry, signIn, signOut }}>{children}</AuthContext.Provider>
}
