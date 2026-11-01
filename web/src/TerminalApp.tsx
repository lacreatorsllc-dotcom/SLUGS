import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { AgentOverlayProvider } from './components/terminal/AgentActions'
import TerminalLayout from './components/terminal/TerminalLayout'
import { TerminalDataProvider } from './lib/terminal-data'
import AgentPage from './pages/AgentPage'
import Browse from './pages/Browse'
import Burn from './pages/Burn'
import Compare from './pages/Compare'
import Deploy from './pages/Deploy'
import Home from './pages/Home'
import Leaderboard from './pages/Leaderboard'
import PaperList from './pages/PaperList'
import PaperStrategy from './pages/PaperStrategy'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Swap from './pages/Swap'
import Token from './pages/Token'
import Vaults from './pages/Vaults'
import './terminal.css'

export default function TerminalApp() {
  const { pathname } = useLocation()
  useEffect(() => {
    const title = pathname === '/home' || pathname === '/leaderboard' ? 'Leaderboard' : pathname === '/agents/compare' ? 'Compare agents' : pathname.startsWith('/agents/') ? 'Agent' : pathname === '/agents' ? 'Agents' : pathname === '/token' ? '$SLUGS' : pathname === '/burn' ? 'Skip the line' : pathname === '/vaults' ? 'Vaults' : pathname === '/swap' ? 'Swap' : pathname === '/profile' ? 'Your profile' : pathname === '/settings' ? 'Settings' : pathname === '/deploy' ? 'Deploy a slug' : pathname.startsWith('/paper') ? 'Paper trading' : 'Page not found'
    document.title = `${title} · SLUGS`
  }, [pathname])
  return <TerminalDataProvider><div className="terminal"><AgentOverlayProvider><Routes>
    <Route path="/burn" element={<Burn />} />
    <Route element={<TerminalLayout />}>
      <Route path="/home" element={<Home />} /><Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/agents" element={<Browse />} /><Route path="/agents/compare" element={<Compare />} /><Route path="/agents/:id" element={<AgentPage />} />
      <Route path="/vaults" element={<Vaults />} /><Route path="/swap" element={<Swap />} /><Route path="/token" element={<Token />} /><Route path="/profile" element={<Profile />} /><Route path="/settings" element={<Settings />} /><Route path="/deploy" element={<Deploy />} />
      <Route path="/paper" element={<PaperList />} /><Route path="/paper/:id" element={<PaperStrategy />} />
      <Route path="*" element={<p>Page not found. <Link to="/home">Return to the leaderboard</Link>.</p>} />
    </Route>
  </Routes></AgentOverlayProvider></div></TerminalDataProvider>
}
