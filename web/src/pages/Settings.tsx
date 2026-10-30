import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ACCESS, BAUM } from '../config'
import Icon from '../components/terminal/Icon'
import { AvatarRing, Callout, CopyButton, EmptyState, IconLink } from '../components/terminal/ui'
import { useAuthSession } from '../lib/auth-context'
import { baumLinks } from '../lib/baum'
import { shortAddress } from '../lib/terminal-model'

// Settings for the signed-in person's Baum account, through api/account.js and Baum's
// partner account API. A SLUGS account is a Baum account, so a change here is the
// same change in Telegram and on baumai.xyz.

type Account = {
  username: string | null
  usernameChange: { canChange: boolean; changesLeft: number; nextChangeAt: string | null }
  avatarUrl: string | null
  email: string | null
  emailVerified: boolean
  personalWallet: string | null
  walletDetails: { address: string; label: string | null; agent: { name: string; slug: string | null; username: string | null; status: 'active' | 'stopped' } | null }[]
}

async function call(body?: Record<string, unknown>) {
  const res = await fetch(`/api/account${body ? '' : '?action=me'}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
  }).catch(() => null)
  const json = res ? await res.json().catch(() => ({})) : {}
  return { ok: Boolean(res?.ok), json }
}

const reasonText = (json: { reason?: unknown }) => (typeof json.reason === 'string' && json.reason.includes(' ') ? json.reason : 'That didn’t save. Try again.')

function Section({ icon, title, children }: { icon: Parameters<typeof Icon>[0]['name']; title: string; children: ReactNode }) {
  return <section className="t-feature-card"><div className="t-section-title"><span className="t-section-icon"><Icon name={icon} /></span><h2>{title}</h2></div>{children}</section>
}

/** One field that saves on its own, with its own error. */
function Field({ label, value, placeholder, note, onSave, disabled }: { label: string; value: string; placeholder?: string; note?: ReactNode; onSave: (next: string) => Promise<string | null>; disabled?: boolean }) {
  const [next, setNext] = useState(value)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null)
  useEffect(() => setNext(value), [value])
  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setMessage(null)
    const error = await onSave(next.trim())
    setBusy(false)
    setMessage(error ? { error: true, text: error } : { error: false, text: 'Saved.' })
  }
  return <form className="t-content-stack" onSubmit={save}>
    <label className="t-fine">{label}</label>
    <div className="t-actions"><input value={next} placeholder={placeholder} onChange={(e) => { setNext(e.target.value); setMessage(null) }} disabled={disabled || busy} aria-label={label} />
      <button type="submit" className="t-submit t-submit--secondary" style={{ width: 'auto' }} disabled={disabled || busy || next.trim() === value}>{busy ? 'Saving…' : 'Save'}</button></div>
    {note && <p className="t-fine">{note}</p>}
    {message && <p className={`t-fine${message.error ? ' t-negative' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
  </form>
}

export default function Settings() {
  const { user } = useAuthSession()
  const [account, setAccount] = useState<Account | null | undefined>(undefined)
  const [pictureError, setPictureError] = useState('')
  const load = useCallback(() => call().then((r) => setAccount(r.ok ? (r.json as Account) : null)), [])
  useEffect(() => { if (user) load() }, [user, load])
  useEffect(() => { document.title = 'Settings · SLUGS' }, [])

  if (!user) return <EmptyState title="Not signed in" icon="user" action={<IconLink icon="user" label="Log in with Baum" to="/login" variant="outline" />}>Log in with your Baum account to change your settings.</EmptyState>
  if (account === undefined) return <p className="t-muted" role="status">Loading your settings…</p>
  if (!account) return <Callout error onRetry={load}>Couldn’t load your settings from Baum.</Callout>

  const save = async (body: Record<string, unknown>) => {
    const r = await call(body)
    if (!r.ok) return reasonText(r.json)
    await load()
    return null
  }
  async function upload(file: File | undefined) {
    setPictureError('')
    if (!file) return
    if (file.size > 3 * 1024 * 1024) return setPictureError('That picture is over 3 MB. Try a smaller one.')
    const picture = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.readAsDataURL(file) })
    const error = await save({ action: 'avatar', picture, type: file.type })
    if (error) setPictureError(error)
  }
  const change = account.usernameChange
  const usernameNote = !account.username ? 'Your agents’ slugs are made from it, so pick one before you deploy a slug.'
    : change.canChange ? `You can change it ${change.changesLeft} more time${change.changesLeft === 1 ? '' : 's'}. Changes are 90 days apart. Your agents’ slugs never change.`
    : `You can change it again ${change.nextChangeAt ? `on ${new Date(change.nextChangeAt).toLocaleDateString()}` : 'later'}.`
  const agents = account.walletDetails.filter((w) => w.agent)

  return <>
    <div className="t-page-heading"><div><h1>Settings</h1><p>Your SLUGS account is your Baum account. Changes here show in Telegram and on baumai.xyz too.</p></div><div className="t-heading-actions"><IconLink icon="user" label="Your profile" to="/profile" variant="outline" /></div></div>
    <div className="t-grid-three">
      <Section icon="user" title="Account">
        <div className="t-actions"><AvatarRing agent={{ id: account.personalWallet ?? account.walletDetails[0]?.address ?? 'you', name: account.username ?? 'you', avatarUrl: account.avatarUrl ?? undefined }} large />
          <label className="t-submit t-submit--secondary" style={{ width: 'auto', cursor: 'pointer' }}>Change picture<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => upload(e.target.files?.[0])} /></label>
          {account.avatarUrl && <button type="button" className="t-submit t-submit--secondary" style={{ width: 'auto' }} onClick={async () => { const e = await save({ action: 'avatar-clear' }); if (e) setPictureError(e) }}>Remove</button>}</div>
        {pictureError && <p className="t-fine t-negative" role="alert">{pictureError}</p>}
        <Field label="Username" value={account.username ?? ''} placeholder="Pick a username" note={usernameNote} disabled={Boolean(account.username) && !change.canChange} onSave={(username) => save({ action: 'username', username })} />
        <Field label="Email" value={account.email ?? ''} placeholder="you@example.com" note={account.email ? (account.emailVerified ? 'Confirmed.' : 'Not confirmed yet: Baum sent a confirmation link to it.') : 'Optional. Baum sends a confirmation link.'} onSave={async (email) => { const e = await save({ action: 'email', email }); return e }} />
      </Section>

      <Section icon="wallet" title="Wallets & funding">
        <div className="t-key-value"><span>Personal wallet</span>{account.personalWallet ? <strong title={account.personalWallet}>{shortAddress(account.personalWallet)} <CopyButton value={account.personalWallet} /></strong> : <a href={ACCESS.linkWallet} target="_blank" rel="noreferrer">Link on baumai.xyz</a>}</div>
        {account.walletDetails.map((w) => <div className="t-key-value" key={w.address}><span>{w.agent ? `${w.agent.username ?? w.agent.name} · agent` : w.label ?? 'Baum wallet'}</span><strong title={w.address}>{shortAddress(w.address)} <CopyButton value={w.address} /></strong></div>)}
        <p className="t-fine">Fund a wallet from Telegram: tell Baum “fund oak with $20”, or send ETH on Robinhood Chain to its address.</p>
      </Section>

      <Section icon="bot" title="Agents">
        {agents.length === 0 ? <p>You haven’t deployed a slug yet.</p> : agents.map(({ address, agent }) => agent && <div className="t-content-stack" key={address}>
          <div className="t-key-value"><Link to={`/agents/${agent.slug ?? address}`}>{agent.username ?? agent.name}</Link><strong>{agent.status === 'stopped' ? 'Stopped' : 'Running'}</strong></div>
          {agent.slug && <div className="t-key-value"><span>Slug (permanent)</span><strong>{agent.slug}</strong></div>}
          <Field label={`${agent.name}’s username`} value={agent.username ?? ''} placeholder="Give it a username" onSave={(username) => save({ action: 'agent-username', agent: agent.name, username })} />
        </div>)}
        <div className="t-actions"><a className="t-submit t-submit--secondary" href={baumLinks.launch()} target="_blank" rel="noreferrer"><Icon name="plus" />Deploy a slug on Baum</a><a className="t-submit t-submit--secondary" href={`https://t.me/${BAUM.bot}`} target="_blank" rel="noreferrer"><Icon name="telegram" />Open Baum</a></div>
      </Section>
    </div>
  </>
}
