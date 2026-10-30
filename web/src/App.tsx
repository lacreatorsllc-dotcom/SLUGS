import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import Invite from './pages/Invite'
import AuthSessionProvider from './components/AuthSessionProvider'
import RequireAuth from './components/RequireAuth'

// Keep Firebase and the terminal out of the public invite page bundle.
const Login = lazy(() => import('./pages/Login'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const TerminalApp = lazy(() => import('./TerminalApp'))

const STANDALONE: Record<string, () => React.ReactElement> = {
  '/': () => <Invite />,
  '/login': () => <Login />,
  '/reset-password': () => <ResetPassword />,
}

function AppRoutes() {
  const pathname = useLocation().pathname.replace(/\/$/, '') || '/'
  const standalone = STANDALONE[pathname]
  if (standalone) return <Suspense fallback={<div className="invite-page" />}>{standalone()}</Suspense>
  const terminal = <Suspense fallback={<div className="invite-page" role="status" aria-label="Loading SLUGS" />}><TerminalApp /></Suspense>
  return pathname === '/burn' ? terminal : <RequireAuth>{terminal}</RequireAuth>
}

export default function App() {
  return <AuthSessionProvider><AppRoutes /></AuthSessionProvider>
}
