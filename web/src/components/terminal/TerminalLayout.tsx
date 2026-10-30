import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BAUM, BRAND, CHAIN, TOKEN } from '../../config'
import { baumLinks } from '../../lib/baum'
import { useTerminalData } from '../../lib/terminal-context'
import { shortAddress } from '../../lib/terminal-model'
import { connect } from '../../lib/wallet'
import Icon from './Icon'
import { Callout, IconButton, IconLink } from './ui'
import { count, money, price } from '../../lib/terminal-format'

export default function TerminalLayout() {
  const { snapshot } = useTerminalData()
  const token = snapshot?.token
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(new URLSearchParams(search).get('q') ?? '')
  const [account, setAccount] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setQuery(new URLSearchParams(search).get('q') ?? '') }, [pathname, search])
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); input.current?.focus(); input.current?.select() }
    }
    document.addEventListener('keydown', shortcut)
    return () => document.removeEventListener('keydown', shortcut)
  }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  async function connectWallet() {
    setConnecting(true); setError('')
    try { setAccount(await connect()) }
    catch (err) { if ((err as { code?: number }).code !== 4001) setError((err as Error).message) }
    finally { setConnecting(false) }
  }
  return <>
    <a className="t-skip-link" href="#terminal-main">Skip to content</a>
    <header className="t-topbar">
      <Link to="/home" className="t-logo" aria-label="SLUGS home"><img src={`${import.meta.env.BASE_URL}slugs-logo-orange.png`} alt="SLUGS" /></Link>
      <nav className="t-nav" aria-label="Main navigation">
        <NavLink to="/home" className={pathname === '/home' || pathname === '/leaderboard' ? 'active' : ''}>Leaderboard</NavLink>
        <NavLink to="/agents">Agents</NavLink><NavLink to="/vaults">Vaults</NavLink><NavLink to="/token" className={pathname === '/token' || pathname === '/swap' ? 'active' : ''}>${TOKEN.symbol}</NavLink>
      </nav>
      <form className="t-search" role="search" onSubmit={(event) => { event.preventDefault(); navigate(`/agents${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`); input.current?.blur() }}>
        <Icon name="search" size={14} /><input ref={input} type="search" aria-label="Search agents and wallet addresses" placeholder="Search agents, @usernames, wallets" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘K</kbd>
      </form>
      <div className="t-top-actions">
        <IconButton icon="star" label="Watchlist · coming soon" disabled className="t-secondary-action" variant="outline" />
        <button type="button" className="t-wallet t-icon--outline" onClick={connectWallet} disabled={connecting} aria-label={account ? `Connected wallet ${account}` : 'Connect wallet'} title={account ? account : `Connect wallet on ${CHAIN.name}`}><Icon name="wallet" size={14} /><span>{connecting ? 'Connecting…' : account ? shortAddress(account) : 'Connect wallet'}</span></button>
        <IconLink icon="plus" label="Deploy your slug on Baum" href={baumLinks.launch()} variant="primary" />
        <IconButton icon="bell" label="Notifications · coming soon" disabled variant="outline" className="t-secondary-action" />
        <IconLink icon="user" label="Sign in to SLUGS" to="/login" variant="outline" />
      </div>
    </header>
    <main className="t-main" id="terminal-main" tabIndex={-1}>
      {error && <Callout error>{error}<IconButton icon="close" label="Dismiss wallet error" onClick={() => setError('')} /></Callout>}
      <Outlet />
    </main>
    <footer className="t-statusbar">
      <IconLink icon="x" label={`${BRAND.name} on X`} href={`https://x.com/${BRAND.x}`} />
      <IconLink icon="telegram" label="Open Baum in Telegram" href={baumLinks.ref()} />
      <span className="t-status-divider" />
      <span className="t-feed-status"><span className={`t-dot${snapshot && !snapshot.boardError ? ' t-dot--online' : ''}`} />Baum</span>
      <Link to="/token">${TOKEN.symbol} <strong>{price(token?.priceUsd)}</strong></Link>
      <span className="t-status-market">MC <strong>{money(token?.marketCapUsd)}</strong></span>
      <Link to="/burn">Burned <strong className="t-accent">{count(token?.burned)}</strong></Link>
      <span className="t-status-disclaimer">Not financial advice. Agents trade real funds on-chain.</span>
      <a className="t-status-chat" href={`https://t.me/${BAUM.bot}`} target="_blank" rel="noreferrer" title="Chat with Baum in Telegram" aria-label="Chat with Baum in Telegram"><Icon name="message" size={14} /></a>
    </footer>
  </>
}
