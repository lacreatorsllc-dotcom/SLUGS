import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BAUM, BRAND, TOKEN } from '../../config'
import { baumLinks } from '../../lib/baum'
import { useTerminalData } from '../../lib/terminal-context'
import { useAuthSession } from '../../lib/auth-context'
import Icon from './Icon'
import { Callout, CopyButton, FloatingCard, IconButton, IconLink } from './ui'
import WelcomeTour from './WelcomeTour'
import { timeLeft } from '../../lib/invite'
import { count, money, price } from '../../lib/terminal-format'

export default function TerminalLayout() {
  const { user, guest, signOut } = useAuthSession()
  // Their own invite link, slugs.run/<code>: the short name when the code has one.
  const invite = user?.invites?.[0]
  const inviteLink = invite ? `${location.origin}/${invite.aliases[0] ?? invite.code}` : null
  const { snapshot } = useTerminalData()
  const token = snapshot?.token
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(new URLSearchParams(search).get('q') ?? '')
  const [deploying, setDeploying] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
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
  async function leave() {
    setSigningOut(true)
    try { await signOut() }
    catch { setError('Couldn’t sign out. Check your connection and try again.') }
    finally { setSigningOut(false) }
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
        <Icon name="search" size={14} /><input ref={input} type="search" aria-label="Search agents and wallet addresses" placeholder="Search agents, slugs, @usernames, wallets" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘K</kbd>
      </form>
      <div className="t-top-actions">
        <IconButton icon="star" label="Watchlist · coming soon" disabled className="t-secondary-action" variant="outline" />
        <IconButton icon="plus" label="Deploy your slug" variant="primary" onClick={() => setDeploying(true)} />
        <IconButton icon="bell" label="Notifications · coming soon" disabled variant="outline" className="t-secondary-action" />
        {inviteLink && <CopyButton value={inviteLink} label={`Copy your invite link, ${inviteLink.replace(/^https?:\/\//, '')}`} />}
        {user
          ? <><IconLink icon="user" label="Your profile" to="/profile" variant="outline" /><IconButton icon="signout" label={signingOut ? 'Signing out…' : 'Sign out'} variant="outline" onClick={leave} disabled={signingOut} /></>
          : <IconLink icon="user" label="Log in with Baum" to="/login" variant="outline" />}
      </div>
    </header>
    <main className="t-main" id="terminal-main" tabIndex={-1}>
      {!user && guest && <div className="t-guest"><Callout>
        {guest.from ? <><strong>{guest.from}</strong> invited you. </> : 'You’re in on an invite. '}
        You have {timeLeft(guest)} to make your SLUGS account, or you’ll need an invite code again. Your account is your Baum account, made in Telegram.
        <a className="t-guest-cta" href={baumLinks.join(guest.code)} target="_blank" rel="noreferrer">Create my account on Baum</a>
      </Callout></div>}
      {error && <Callout error>{error}<IconButton icon="close" label="Dismiss error" onClick={() => setError('')} /></Callout>}
      <Outlet />
    </main>
    {deploying && <FloatingCard title="Deploy your slug" onClose={() => setDeploying(false)}>
      <p>A slug is an AI trading agent that trades for you. Baum makes it with you in Telegram: it gets its own wallet, trades by itself within rules you confirm once, and messages you every time it trades.</p>
      <p>Today a slug runs DCA: it buys the tokens you pick, an amount you set, every day or every week. Once you fund it, Baum sends you its page here, and its trades rank on the leaderboard.</p>
      <a className="t-submit" href={baumLinks.launch()} target="_blank" rel="noreferrer" onClick={() => setDeploying(false)}><Icon name="telegram" />Open Baum in Telegram</a>
      <p className="t-fine">In Telegram, say “launch an agent” to start.</p>
    </FloatingCard>}
    <WelcomeTour />
    <footer className="t-statusbar">
      <IconLink icon="x" label={`${BRAND.name} on X`} href={`https://x.com/${BRAND.x}`} />
      <IconLink icon="telegram" label={`${BRAND.name} on Telegram`} href={BRAND.telegram} />
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
