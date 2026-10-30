import { NavLink, Link, Route, Routes } from 'react-router-dom'
import { BRAND, STAGE, TOKEN } from './config'
import { LaunchButtons } from './components/ui'
import { ponsUrl } from './lib/baum'
import Home from './pages/Home'
import Leaderboard from './pages/Leaderboard'
import Browse from './pages/Browse'
import AgentPage from './pages/AgentPage'
import Vaults from './pages/Vaults'
import Swap from './pages/Swap'
import Token from './pages/Token'

export default function App() {
  return (
    <>
      <aside className="token-bar" aria-label="Token">
        <div className="wrap">
          <span className="row" style={{ gap: 12 }}>
            <span className="live">TOKEN LIVE</span>
            <span>Now on <Link to="/token">Robinhood Chain</Link></span>
            <span className="beta">· {STAGE}: numbers, fees and features will change</span>
          </span>
          <a href={ponsUrl()} target="_blank" rel="noreferrer">View token ↗</a>
        </div>
      </aside>
      <header className="nav">
        <div className="wrap">
          <Link to="/" className="logo" aria-label={BRAND.name}><img src={`${import.meta.env.BASE_URL}slugs-logo.png`} alt={BRAND.name} /></Link>
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
          <Route path="/" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/agents" element={<Browse />} />
          <Route path="/agents/:id" element={<AgentPage />} />
          <Route path="/vaults" element={<Vaults />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/token" element={<Token />} />
          <Route path="*" element={<p>Page not found. <Link to="/">Home</Link></p>} />
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
