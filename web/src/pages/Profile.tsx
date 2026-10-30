import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ACCESS, BAUM } from '../config'
import Icon from '../components/terminal/Icon'
import { AvatarRing, Callout, CopyButton, EmptyState, IconLink } from '../components/terminal/ui'
import { useAuthSession } from '../lib/auth-context'
import { baumLinks } from '../lib/baum'
import { count } from '../lib/terminal-format'
import { shortAddress } from '../lib/terminal-model'

// The signed-in person: what Baum shares about their account (GET /api/partner/me),
// their slugs, their invite link, and sign out. Everything is changed in Baum.
export default function Profile() {
  const { user, signOut } = useAuthSession()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  if (!user) return <EmptyState title="Not signed in" icon="user" action={<IconLink icon="user" label="Log in with Baum" to="/login" variant="outline" />}>Log in with your Baum account to see your profile.</EmptyState>
  const wallet = user.wallets[0] ?? ''
  const name = user.username ? `@${user.username}` : 'No username yet'
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
        <h1>{name}</h1>
        <div className="t-actions t-fine">{wallet && <><span title={wallet}>{shortAddress(wallet)} · Your Baum account</span><CopyButton value={wallet} /></>}</div>
      </div>
    </div>
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
        <div className="t-key-value"><span>Username</span><strong>{user.username ? `@${user.username}` : '—'}</strong></div>
        <div className="t-key-value"><span>Strategy</span><strong>{user.strategy?.name ?? '—'}</strong></div>
        <div className="t-key-value"><span>Copy trading</span><strong>{user.copy ? `${user.copy.status} · ${count(user.copy.sources.length)} ${user.copy.sources.length === 1 ? 'trader' : 'traders'}` : 'Off'}</strong></div>
        <p className="t-fine">Your SLUGS account is your Baum account. Change your username with <code>/username</code> and your picture by sending Baum a photo captioned <code>/avatar</code>, or on <a href={ACCESS.linkWallet} target="_blank" rel="noreferrer">baumai.xyz/account</a>.</p>
        <div className="t-actions"><a className="t-submit t-submit--secondary" href={`https://t.me/${BAUM.bot}`} target="_blank" rel="noreferrer"><Icon name="telegram" />Open Baum in Telegram</a></div>
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
        <div className="t-actions"><button type="button" className="t-submit t-submit--secondary" onClick={leave} disabled={signingOut}><Icon name="signout" />{signingOut ? 'Signing out…' : 'Sign out'}</button></div>
      </section>
    </div>
  </>
}
