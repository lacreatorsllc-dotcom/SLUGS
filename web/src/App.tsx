import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import Invite from './pages/Invite'

// Keep Firebase and the terminal out of the public invite page bundle.
const Login = lazy(() => import('./pages/Login'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const TerminalApp = lazy(() => import('./TerminalApp'))

const STANDALONE: Record<string, () => React.ReactElement> = {
  '/': () => <Invite />,
  '/login': () => <Login />,
  '/reset-password': () => <ResetPassword />,
}

export default function App() {
  const standalone = STANDALONE[useLocation().pathname.replace(/\/$/, '') || '/']
  if (standalone) return <Suspense fallback={<div className="invite-page" />}>{standalone()}</Suspense>
  return <Suspense fallback={<div className="invite-page" role="status" aria-label="Loading SLUGS" />}><TerminalApp /></Suspense>
}
