import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BAUM, BRAND } from '../config'
import Icon from '../components/terminal/Icon'
import { SocialBar } from '../components/terminal/Follows'
import { EditDisplayName, EditUsername } from '../components/terminal/ProfileEdits'
import TokensSection from '../components/terminal/TokensSection'
import { PnlCardButton } from '../components/terminal/AgentActions'
import { AvatarRing, Callout, CopyButton, EmptyState, IconButton, IconLink } from '../components/terminal/ui'
import { useAuthSession } from '../lib/auth-context'
import { baumLinks } from '../lib/baum'
import { useSocial } from '../lib/social'
import { count } from '../lib/terminal-format'
import { shortAddress } from '../lib/terminal-model'
import { useTerminalData } from '../lib/terminal-context'

// The signed-in person: what Baum shares about their account (GET /api/partner/me),
// their slugs, their invite link, and sign out. Everything is changed in Baum.
export default function Profile() {
  const { user, signOut } = useAuthSession()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  // ?edit=username opens the username editor, e.g. from the welcome tour's last card.
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<'username' | 'name' | null>(null)
  useEffect(() => {
    if (params.get('edit') !== 'username') return
    setEditing('username')
    setParams((previous) => { const next = new URLSearchParams(previous); next.delete('edit'); return next }, { replace: true })
  }, [params, setParams])
  const social = useSocial(user?.wallets[0])
  const { snapshot } = useTerminalData()
  if (!user) return <EmptyState title="Not signed in" icon="user" action={<IconLink icon="user" label="Sign in with Baum" to="/login" variant="outline" />}>Sign in with Baum to see your profile.</EmptyState>
  const wallet = user.wallets[0] ?? ''
  const ownAgent = snapshot?.agents.find((agent) => agent.id === wallet.toLowerCase() && agent.trading['7d'])
  const name = user.username ? `@${user.username}` : 'No username yet'
  const displayName = typeof social.state === 'object' ? social.state.displayName : null
  const namesOn = social.state !== 'off'
  const agents = user.agents ?? []
  const invite = user.invites?.[0]
  const inviteLink = invite ? `${location.origin}/${invite.aliases[0] ?? invite.code}` : null
  async function leave() {
    setSigningOut(true)
    try { await signOut() }
    catch { setError('Couldn’t sign out. Check your connection and try again.') }
    finally { setSigningOut(false) }
  }
  return <>
    <div className="t-agent-heading">
      <AvatarRing agent={{ id: wallet || name, name: user.username ?? 'you', avatarUrl: user.avatarUrl ?? undefined }} large />
      <div className="t-agent-heading-info">
        <div className="t-profile-name">
          <h1>{displayName ?? user.username ?? 'No username yet'}</h1>
          {ownAgent && <PnlCardButton agent={ownAgent} range="7d" />}
          {namesOn && <IconButton icon="edit" label="Edit display name" onClick={() => setEditing('name')} />}
        </div>
        <div className="t-actions t-fine">
          {user.username && <span className="t-slug-chip">{user.username}<CopyButton value={user.username} label={`Copy ${user.username}`} /></span>}
          <button type="button" className="t-link-button" onClick={() => setEditing('username')}>{user.username ? 'Edit username' : 'Pick a username'}</button>
          {wallet && <><span title={wallet}>{shortAddress(wallet)} · Baum wallet</span><CopyButton value={wallet} /></>}
        </div>
        {wallet && <SocialBar wallet={wallet} name={user.username ?? 'You'} />}
      </div>
    </div>
    {editing === 'username' && <EditUsername onClose={() => setEditing(null)} />}
    {editing === 'name' && <EditDisplayName current={displayName} username={user.username} onClose={() => setEditing(null)} onSaved={() => social.reload()} />}
    {error && <Callout error>{error}</Callout>}
    <div className="t-grid-three">
      <section className="t-feature-card">
        <div className="t-section-title"><span className="t-section-icon"><Icon name="bot" /></span><h2>Your slugs</h2></div>
        {agents.length
          ? agents.map((agent) => <div className="t-key-value" key={agent.wallet}>
            <Link to={`/agents/${agent.slug ?? agent.wallet}`}>{agent.name}{agent.slug ? ` · ${agent.slug}` : ''}</Link>
            <strong>{agent.status === 'stopped' ? 'Stopped' : 'Running'}</strong>
          </div>)
          : <p>You haven’t deployed a slug yet. Baum sets one up with you in Telegram, and once it’s funded its page is here.</p>}
        <div className="t-actions"><a className="t-submit t-submit--secondary" href={baumLinks.launch()} target="_blank" rel="noreferrer"><Icon name="plus" />Deploy a slug on Baum</a></div>
      </section>
      <section className="t-feature-card">
        <div className="t-section-title"><span className="t-section-icon"><Icon name="user" /></span><h2>Account</h2></div>
        <div className="t-key-value"><span>Username</span><strong>{user.username ?? '—'}</strong></div>
        <div className="t-key-value"><span>Strategy</span><strong>{user.strategy?.name ?? '—'}</strong></div>
        <div className="t-key-value"><span>Copy trading</span><strong>{user.copy ? `${user.copy.status} · ${count(user.copy.sources.length)} ${user.copy.sources.length === 1 ? 'trader' : 'traders'}` : 'Off'}</strong></div>
        <p className="t-fine">You sign in to SLUGS with Baum. Change your picture, email and your agents’ usernames in Settings. They’re kept with your Baum account, so they also show in Baum.</p>
        <div className="t-actions"><Link className="t-submit t-submit--secondary" to="/settings"><Icon name="settings" />Settings</Link><a className="t-submit t-submit--secondary" href={`https://t.me/${BAUM.bot}`} target="_blank" rel="noreferrer"><Icon name="telegram" />Open Baum</a></div>
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
        <div className="t-actions"><button type="button" className="t-submit t-submit--secondary" onClick={leave} disabled={signingOut}><Icon name="signout" />{signingOut ? 'Signing out…' : 'Sign out'}</button></div>
      </section>
    </div>
    {wallet && <TokensSection wallet={wallet} />}
  </>
}
