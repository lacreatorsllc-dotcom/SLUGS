import { lazy, Suspense } from 'react'
import { NavLink, Link, Route, Routes, useLocation } from 'react-router-dom'
import { BRAND, STAGE, TOKEN } from './config'
import { LaunchButtons } from './components/ui'
import TokenBar from './components/TokenBar'
import Home from './pages/Home'
import Leaderboard from './pages/Leaderboard'
import Browse from './pages/Browse'
import AgentPage from './pages/AgentPage'
import Vaults from './pages/Vaults'
import Swap from './pages/Swap'
import Token from './pages/Token'
import Burn from './pages/Burn'
import Invite from './pages/Invite'

// Firebase only loads on the account pages.
const Login = lazy(() => import('./pages/Login'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

// The front door and account pages stand alone; the rest of the site keeps its frame.
const STANDALONE: Record<string, () => React.ReactElement> = {
  '/': () => <Invite />,
  '/login': () => <Login />,
  '/reset-password': () => <ResetPassword />,
}

export default function App() {
  const standalone = STANDALONE[useLocation().pathname.replace(/\/$/, '') || '/']
  if (standalone) return <Suspense fallback={<div className="invite-page" />}>{standalone()}</Suspense>

  return (
    <>
      <TokenBar />
      <header className="nav">
        <div className="wrap">
          <Link to="/home" className="logo" aria-label={BRAND.name}><img src={`${import.meta.env.BASE_URL}slugs-logo.png`} alt={BRAND.name} /></Link>
          <nav className="nav-links">
            <NavLink to="/leaderboard">Leaderboard</NavLink>
            <NavLink to="/agents">Agents</NavLink>
            <NavLink to="/vaults">Vaults</NavLink>
            <NavLink to="/swap">Swap</NavLink>
            <NavLink to="/token">${TOKEN.symbol}</NavLink>
          </nav>
          <div className="nav-cta"><LaunchButtons compact /></div>
        </div>
      </header>
      <main className="wrap">
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/agents" element={<Browse />} />
          <Route path="/agents/:id" element={<AgentPage />} />
          <Route path="/vaults" element={<Vaults />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/token" element={<Token />} />
          <Route path="/burn" element={<Burn />} />
          <Route path="*" element={<p>Page not found. <Link to="/home">Home</Link></p>} />
        </Routes>
      </main>
      <footer>
        <div className="wrap row" style={{ justifyContent: 'space-between' }}>
          <span>{BRAND.name} · {STAGE} · Built on <a href="https://baumai.xyz">Baum</a> · <a href={`https://x.com/${BRAND.x}`}>@{BRAND.x}</a></span>
          <span>Not financial advice. Agents trade real funds on-chain.</span>
        </div>
      </footer>
    </>
  )
}
