import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import Invite from './pages/Invite'
import InviteLink from './pages/InviteLink'
import AuthSessionProvider from './components/AuthSessionProvider'
import RequireAuth from './components/RequireAuth'

// Keep the terminal out of the public invite page bundle.
const Login = lazy(() => import('./pages/Login'))
const ConnectBaum = lazy(() => import('./pages/ConnectBaum'))
const TerminalApp = lazy(() => import('./TerminalApp'))

const STANDALONE: Record<string, () => React.ReactElement> = {
  '/': () => <Invite />,
  '/login': () => <Login />,
  '/connect-baum': () => <ConnectBaum />,
}

// The site's own top-level pages. Any other single segment that looks like a referral
// code is an invite link: slugs.run/<code>.
const PAGES = new Set(['home', 'leaderboard', 'agents', 'vaults', 'swap', 'token', 'burn', 'login', 'connect-baum'])
const INVITE_CODE = /^\/([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)$/

function AppRoutes() {
  const pathname = useLocation().pathname.replace(/\/$/, '') || '/'
  const standalone = STANDALONE[pathname]
  if (standalone) return <Suspense fallback={<div className="invite-page" />}>{standalone()}</Suspense>
  const invite = INVITE_CODE.exec(pathname)?.[1]
  if (invite && !PAGES.has(invite.toLowerCase())) return <InviteLink code={invite} />
  const terminal = <Suspense fallback={<div className="invite-page" role="status" aria-label="Loading SLUGS" />}><TerminalApp /></Suspense>
  return pathname === '/burn' ? terminal : <RequireAuth>{terminal}</RequireAuth>
}

export default function App() {
  return <AuthSessionProvider><AppRoutes /></AuthSessionProvider>
}
