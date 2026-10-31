import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type BaumProfile } from '../lib/auth-context'
import { currentProfile, endSession, redeem } from '../lib/auth'
import { track, trackActiveToday } from '../lib/funnel'
import { acceptInvite as accept, currentPass, type GuestPass } from '../lib/invite'

// Local development only: ?as=<username> acts as that Baum user, since Baum's sign-in
// button always opens the live site. Vite drops this from production builds.
const WALLETS: Record<string, string> = { goobz: '0xf6414c58f65b106232871c0d566c417054ef6b92' }
function devUser(): BaumProfile | null {
  if (!import.meta.env.DEV) return null
  const asked = new URLSearchParams(location.search).get('as')
  if (asked !== null) sessionStorage.setItem('slugs.dev.as', asked)
  const name = (asked ?? sessionStorage.getItem('slugs.dev.as') ?? '').toLowerCase()
  if (!name) return null
  return { username: name, avatarUrl: null, wallets: WALLETS[name] ? [WALLETS[name]] : [], strategy: null, copy: null }
}

export default function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: BaumProfile | null; ready: boolean; error: boolean }>({ user: null, ready: false, error: false })
  const [guest, setGuest] = useState<GuestPass | null>(null)
  const [guestReady, setGuestReady] = useState(false)
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    let active = true
    setState((previous) => ({ ...previous, ready: false, error: false }))
    const dev = devUser()
    ;(dev ? Promise.resolve(dev) : currentProfile())
      .then((user) => { if (active) setState({ user, ready: true, error: false }) })
      .catch(() => { if (active) setState({ user: null, ready: true, error: true }) })
    currentPass().then((pass) => { if (active) { setGuest(pass); setGuestReady(true) } })
    return () => { active = false }
  }, [revision])
  const refresh = useCallback(async () => {
    if (devUser()) return
    const user = await currentProfile().catch(() => undefined)
    if (user !== undefined) setState({ user, ready: true, error: false })
  }, [])
  const signIn = useCallback(async (code: string) => {
    setState({ user: await redeem(code), ready: true, error: false })
    track('signed_in')
  }, [])
  // Signed in and using SLUGS today: counted once a day per browser (lib/funnel.ts).
  const signedIn = Boolean(state.user)
  useEffect(() => { if (signedIn) trackActiveToday() }, [signedIn])
  const signOut = useCallback(async () => {
    if (import.meta.env.DEV) sessionStorage.removeItem('slugs.dev.as')
    await endSession()
    setState({ user: null, ready: true, error: false })
  }, [])
  const acceptInvite = useCallback(async (code: string) => {
    const pass = await accept(code)
    setGuest(pass)
    return pass
  }, [])
  return <AuthContext.Provider value={{ ...state, ready: state.ready && guestReady, guest, retry, refresh, signIn, signOut, acceptInvite }}>{children}</AuthContext.Provider>
}
