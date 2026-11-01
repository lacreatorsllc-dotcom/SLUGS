import { lazy, Suspense, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Invite from './pages/Invite'
import InviteLink from './pages/InviteLink'
import AuthSessionProvider from './components/AuthSessionProvider'
import RequireAuth from './components/RequireAuth'
import { track } from './lib/funnel'
import { inviteFromPath, refRedirect } from './lib/invite-path'

// Keep the terminal out of the public invite page bundle.
const Login = lazy(() => import('./pages/Login'))
const ConnectBaum = lazy(() => import('./pages/ConnectBaum'))
const Admin = lazy(() => import('./pages/Admin'))
const TerminalApp = lazy(() => import('./TerminalApp'))

const STANDALONE: Record<string, () => React.ReactElement> = {
  '/': () => <Invite />,
  '/login': () => <Login />,
  '/connect-baum': () => <ConnectBaum />,
  '/admin': () => <Admin />,
}

function AppRoutes() {
  const location = useLocation()
  // ?ref=<code> on any page is the same invite link as slugs.run/<code> (lib/invite-path.ts).
  const fromRef = refRedirect(location.search)
  if (fromRef) return <Navigate to={fromRef} replace />
  const pathname = location.pathname.replace(/\/$/, '') || '/'
  const standalone = STANDALONE[pathname]
  if (standalone) return <Suspense fallback={<div className="invite-page" />}>{standalone()}</Suspense>
  const invite = inviteFromPath(pathname)
  if (invite) return <InviteLink code={invite} />
  const terminal = <Suspense fallback={<div className="invite-page" role="status" aria-label="Loading SLUGS" />}><TerminalApp /></Suspense>
  // Paper strategy pages are for sharing, so anybody can open them, signed in or not.
  const open = pathname === '/burn' || pathname === '/paper' || pathname.startsWith('/paper/')
  return open ? terminal : <RequireAuth>{terminal}</RequireAuth>
}

export default function App() {
  // Once per page load: the top of the funnel (lib/funnel.ts).
  useEffect(() => { track('visit') }, [])
  return <AuthSessionProvider><AppRoutes /></AuthSessionProvider>
}
