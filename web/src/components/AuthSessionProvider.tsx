import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type BaumProfile } from '../lib/auth-context'
import { currentProfile, endSession, redeem } from '../lib/auth'
import { acceptInvite as accept, currentPass, type GuestPass } from '../lib/invite'

export default function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: BaumProfile | null; ready: boolean; error: boolean }>({ user: null, ready: false, error: false })
  const [guest, setGuest] = useState<GuestPass | null>(null)
  const [guestReady, setGuestReady] = useState(false)
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    let active = true
    setState((previous) => ({ ...previous, ready: false, error: false }))
    currentProfile()
      .then((user) => { if (active) setState({ user, ready: true, error: false }) })
      .catch(() => { if (active) setState({ user: null, ready: true, error: true }) })
    currentPass().then((pass) => { if (active) { setGuest(pass); setGuestReady(true) } })
    return () => { active = false }
  }, [revision])
  const signIn = useCallback(async (code: string) => {
    setState({ user: await redeem(code), ready: true, error: false })
  }, [])
  const signOut = useCallback(async () => {
    await endSession()
    setState({ user: null, ready: true, error: false })
  }, [])
  const acceptInvite = useCallback(async (code: string) => {
    const pass = await accept(code)
    setGuest(pass)
    return pass
  }, [])
  return <AuthContext.Provider value={{ ...state, ready: state.ready && guestReady, guest, retry, signIn, signOut, acceptInvite }}>{children}</AuthContext.Provider>
}
