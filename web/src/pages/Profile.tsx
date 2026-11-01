import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BAUM, BRAND } from '../config'
import Icon from '../components/terminal/Icon'
import { SocialBar } from '../components/terminal/Follows'
import { EditDisplayName, EditUsername } from '../components/terminal/ProfileEdits'
import TokensSection from '../components/terminal/TokensSection'
import { PnlCardButton } from '../components/terminal/AgentActions'
import { AvatarRing, Callout, CopyButton, EmptyState, IconLink, RangeControl, StatGrid } from '../components/terminal/ui'
import { useAuthSession } from '../lib/auth-context'
import { useSocial } from '../lib/social'
import { count, money, tone, winRate } from '../lib/terminal-format'
import { rangeLabel, shortAddress, sortedAgents, type Range } from '../lib/terminal-model'
import { useTerminalData } from '../lib/terminal-context'

// The signed-in person: who they are and how their wallet is doing up top, then their
// slugs, invite link and account. Names live on their Baum account (edited here or in
// Baum); trading numbers come from the leaderboards.
export default function Profile() {
  const { user, signOut } = useAuthSession()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [range, setRange] = useState<Range>('7d')
  // ?edit=username opens the username editor, e.g. from the welcome tour's last card.
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<'username' | 'name' | null>(null)
  const menu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (params.get('edit') !== 'username') return
    setEditing('username')
    setParams((previous) => { const next = new URLSearchParams(previous); next.delete('edit'); return next }, { replace: true })
  }, [params, setParams])
  const social = useSocial(user?.wallets[0])
  const { snapshot } = useTerminalData()
  if (!user) return <EmptyState title="Not signed in" icon="user" action={<IconLink icon="user" label="Sign in with Baum" to="/login" variant="outline" />}>Sign in with Baum to see your profile.</EmptyState>

  const wallet = user.wallets[0] ?? ''
  const own = snapshot?.agents.find((agent) => agent.id === wallet.toLowerCase())
  const row = own?.trading[range]
  // Their place on the leaderboard for this range, ranked the way the leaderboard ranks.
  const rank = row && own ? sortedAgents(snapshot?.agents ?? [], range).findIndex((agent) => agent.id === own.id) + 1 : 0
  const displayName = typeof social.state === 'object' ? social.state.displayName : null
  const namesOn = social.state !== 'off'
  const title = displayName ?? user.username ?? 'No username yet'
  const agents = user.agents ?? []
  const invite = user.invites?.[0]
  const inviteLink = invite ? `${location.origin}/${invite.aliases[0] ?? invite.code}` : null
  const meta = [own?.categories[0], rank ? `Rank #${rank} · ${rangeLabel(range)}` : null, agents.length ? `${agents.length} ${agents.length === 1 ? 'slug' : 'slugs'}` : null].filter(Boolean)
  const edit = (what: 'username' | 'name') => { menu.current?.removeAttribute('open'); setEditing(what) }
  async function leave() {
    setSigningOut(true)
    try { await signOut() }
    catch { setError('Couldn’t sign out. Check your connection and try again.') }
    finally { setSigningOut(false) }
  }

  return <>
    <header className="t-profile-head">
      <AvatarRing agent={{ id: wallet || title, name: user.username ?? 'you', avatarUrl: user.avatarUrl ?? undefined }} large />
      <div className="t-profile-who">
        <div className="t-profile-name">
          <h1>{title}</h1>
          {/* With a display name the username sits under it; without one, the title is it. */}
          {!displayName && user.username && <CopyButton value={user.username} label={`Copy ${user.username}`} />}
        </div>
        <div className="t-profile-ids">
          {displayName && user.username && <span className="t-slug-chip">{user.username}<CopyButton value={user.username} label={`Copy ${user.username}`} /></span>}
          {wallet && <span className="t-slug-chip" title={wallet}>{shortAddress(wallet)}<CopyButton value={wallet} /></span>}
          {wallet && <SocialBar wallet={wallet} name={user.username ?? 'You'} />}
        </div>
        {meta.length > 0 && <p className="t-profile-meta">{meta.join(' · ')}</p>}
      </div>
      <div className="t-profile-actions">
        {own && row && <PnlCardButton agent={own} range={range} labelled />}
        <details className="t-menu" ref={menu}>
          <summary className="t-submit t-submit--secondary"><Icon name="edit" size={14} />Edit profile</summary>
          <div className="t-menu-list" role="menu">
            {namesOn && <button type="button" role="menuitem" onClick={() => edit('name')}>Display name</button>}
            <button type="button" role="menuitem" onClick={() => edit('username')}>{user.username ? 'Username' : 'Pick a username'}</button>
            <Link role="menuitem" to="/settings">Picture, email and agents</Link>
            <button type="button" role="menuitem" onClick={leave} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
          </div>
        </details>
      </div>
    </header>
    {editing === 'username' && <EditUsername onClose={() => setEditing(null)} />}
    {editing === 'name' && <EditDisplayName current={displayName} username={user.username} onClose={() => setEditing(null)} onSaved={() => social.reload()} />}
    {error && <Callout error>{error}</Callout>}

    <section className="t-profile-stats" aria-label="Your trading">
      <div className="t-profile-stats-head"><h2>Your trading</h2><RangeControl value={range} onChange={setRange} /></div>
      {row
        ? <StatGrid stats={[
          { label: `PnL · ${rangeLabel(range)}`, value: money(row.pnlUsd, true), tone: tone(row.pnlUsd) },
          { label: 'Volume', value: money(row.volumeUsd) },
          { label: 'Trades', value: count(row.trades) },
          { label: 'Tokens traded', value: count(row.tokens), note: 'Which ones shows once Baum shares them' },
          { label: 'Win rate', value: winRate(row.winRate) },
        ]} />
        : <p className="t-muted">{own ? `No trades in the ${rangeLabel(range).toLowerCase()} range.` : 'Your numbers show here once your wallet trades through Baum.'}</p>}
    </section>

    <div className="t-grid-three">
      <section className="t-feature-card">
        <div className="t-section-title"><span className="t-section-icon"><Icon name="bot" /></span><h2>Your slugs</h2></div>
        {agents.length
          ? agents.map((agent) => <div className="t-key-value" key={agent.wallet}>
            <Link to={`/agents/${agent.slug ?? agent.wallet}`}>{agent.name}{agent.slug ? ` · ${agent.slug}` : ''}</Link>
            <strong>{agent.status === 'stopped' ? 'Stopped' : 'Running'}</strong>
          </div>)
          : <p>You haven’t deployed a slug yet. Set one up here or in Baum on Telegram: it’s the same agent either way.</p>}
        <div className="t-actions"><Link className="t-submit t-submit--secondary" to="/deploy"><Icon name="plus" />Deploy a slug</Link></div>
      </section>
      <section className="t-feature-card">
        <div className="t-section-title"><span className="t-section-icon"><Icon name="star" /></span><h2>Invite friends</h2></div>
        {inviteLink && invite
          ? <>
            <div className="t-key-value"><span>{inviteLink.replace(/^https?:\/\//, '')}</span><CopyButton value={inviteLink} label="Copy your invite link" /></div>
            <div className="t-key-value"><span>Opened</span><strong>{count(invite.clicks)}</strong></div>
            <div className="t-key-value"><span>Accounts made</span><strong>{count(invite.accounts)}</strong></div>
          </>
          : <p>Your invite link shows here once Baum gives you a referral code.</p>}
        <div className="t-key-value"><span>Community</span><strong><a href={BRAND.telegram} target="_blank" rel="noreferrer">Telegram</a> · <a href={`https://x.com/${BRAND.x}`} target="_blank" rel="noreferrer">X</a></strong></div>
      </section>
      <section className="t-feature-card">
        <div className="t-section-title"><span className="t-section-icon"><Icon name="user" /></span><h2>Account</h2></div>
        <div className="t-key-value"><span>Strategy</span><strong>{user.strategy?.name ?? '—'}</strong></div>
        <div className="t-key-value"><span>Copy trading</span><strong>{user.copy ? `${user.copy.status} · ${count(user.copy.sources.length)} ${user.copy.sources.length === 1 ? 'trader' : 'traders'}` : 'Off'}</strong></div>
        <p className="t-fine">SLUGS and Baum are one account: your username, picture and agents show in both.</p>
        <div className="t-actions"><Link className="t-submit t-submit--secondary" to="/settings"><Icon name="settings" />Settings</Link><a className="t-submit t-submit--secondary" href={`https://t.me/${BAUM.bot}`} target="_blank" rel="noreferrer"><Icon name="telegram" />Open Baum</a></div>
      </section>
    </div>
    {wallet && <TokensSection wallet={wallet} />}
  </>
}
