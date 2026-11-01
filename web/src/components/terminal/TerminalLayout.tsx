import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BRAND, TOKEN } from '../../config'
import { baumLinks } from '../../lib/baum'
import { useTerminalData } from '../../lib/terminal-context'
import { useAuthSession } from '../../lib/auth-context'
import Icon from './Icon'
import { AvatarRing, Callout, IconButton, IconLink } from './ui'
import ChatWidget from './ChatWidget'
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
        <Icon name="search" size={14} /><input ref={input} type="search" aria-label="Search slugs, profiles, contract addresses and wallets" placeholder="Search slugs, profiles, CAs and wallets" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘K</kbd>
      </form>
      {/* Every action says what it is in words: icons alone left people guessing until they clicked. */}
      <div className="t-top-actions">
        <Link className="t-top-button t-top-button--primary" to="/deploy"><Icon name="plus" size={14} /><span>Deploy a slug</span></Link>
        {user
          ? <AccountMenu name={user.username ? `@${user.username}` : 'Your account'} id={user.wallets[0] ?? user.username ?? 'you'} avatarUrl={user.avatarUrl ?? undefined} inviteLink={inviteLink} signingOut={signingOut} onSignOut={leave} />
          : <Link to="/login" className="t-top-button"><Icon name="user" size={14} /><span>Sign in</span></Link>}
      </div>
    </header>
    <main className="t-main" id="terminal-main" tabIndex={-1}>
      {!user && guest && <div className="t-guest"><Callout>
        {guest.from ? <><strong>{guest.from}</strong> invited you. </> : 'You’re in on an invite. '}
        You have {timeLeft(guest)} to make your SLUGS account, or you’ll need an invite code again. SLUGS uses Baum for sign-in, so it takes a minute in Telegram.
        <a className="t-guest-cta" href={baumLinks.join(guest.code)} target="_blank" rel="noreferrer">Sign up with Baum</a>
      </Callout></div>}
      {error && <Callout error>{error}<IconButton icon="close" label="Dismiss error" onClick={() => setError('')} /></Callout>}
      <Outlet />
    </main>
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
      <ChatWidget />
    </footer>
  </>
}

// The signed-in account: who you are, and everything about you behind one labelled menu.
function AccountMenu({ name, id, avatarUrl, inviteLink, signingOut, onSignOut }: { name: string; id: string; avatarUrl?: string; inviteLink: string | null; signingOut: boolean; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'idle' | 'copied' | 'error'>('idle')
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  useEffect(() => {
    if (copied === 'idle') return
    const timeout = window.setTimeout(() => setCopied('idle'), 2500)
    return () => window.clearTimeout(timeout)
  }, [copied])
  async function copy() {
    if (!inviteLink) return
    try { await navigator.clipboard.writeText(inviteLink); setCopied('copied') }
    catch { setCopied('error') }
  }
  return <div className="t-account" ref={ref}>
    <button type="button" className="t-top-button t-account-button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <AvatarRing agent={{ id, name, avatarUrl }} /><span className="t-account-name">{name}</span><Icon name="chevron" size={12} />
    </button>
    {open && <div className="t-account-menu" role="menu" aria-label="Your account">
      <Link role="menuitem" to="/profile"><Icon name="user" size={14} /><span>Your profile</span></Link>
      {inviteLink && <button type="button" role="menuitem" onClick={copy}><Icon name={copied === 'copied' ? 'check' : 'copy'} size={14} /><span>{copied === 'copied' ? 'Invite link copied' : copied === 'error' ? 'Couldn’t copy. Try again' : 'Copy your invite link'}<small>{inviteLink.replace(/^https?:\/\//, '')}</small></span></button>}
      <button type="button" role="menuitem" onClick={onSignOut} disabled={signingOut}><Icon name="signout" size={14} /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span></button>
    </div>}
  </div>
}
