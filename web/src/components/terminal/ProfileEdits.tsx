import { useEffect, useState, type FormEvent } from 'react'
import { call, reasonText, type Account } from '../../lib/account'
import { useAuthSession } from '../../lib/auth-context'
import { saveDisplayName } from '../../lib/social'
import { Callout, FloatingCard } from './ui'

// The floating editors on a profile. A username is the person's SLUG and lives on
// their Baum account (api/account.js), so it changes in Baum too and Baum sets how
// often. A display name is SLUGS' own (api/social.js): free text shown above the SLUG.

export function EditUsername({ onClose }: { onClose: () => void }) {
  const { refresh } = useAuthSession()
  const [account, setAccount] = useState<Account | null | undefined>(undefined)
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    call().then((r) => {
      const found = r.ok ? (r.json as Account) : null
      setAccount(found)
      setNext(found?.username ?? '')
    })
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    const r = await call({ action: 'username', username: next })
    setBusy(false)
    if (!r.ok) return setError(reasonText(r.json))
    await refresh()
    onClose()
  }

  const change = account?.usernameChange
  const locked = Boolean(account?.username) && change?.canChange === false
  const note = !account?.username ? 'Your agents’ SLUGs start with it, so pick one before you deploy an agent.'
    : locked ? `You can change it again ${change?.nextChangeAt ? `on ${new Date(change.nextChangeAt).toLocaleDateString()}` : 'later'}.`
    : `You can change it ${change?.changesLeft} more time${change?.changesLeft === 1 ? '' : 's'}, 90 days apart.`
  return <FloatingCard title="Edit username" onClose={onClose} className="t-edit-dialog">
    {account === undefined && <p className="t-muted" role="status">Loading…</p>}
    {account === null && <Callout error>Couldn’t load your account from Baum. Close this and try again.</Callout>}
    {account && <form className="t-content-stack" onSubmit={save}>
      <p>Your username is your SLUG: people find, follow and copy you by it. It’s your Baum username, so it changes in Baum too.</p>
      <label htmlFor="edit-username">Username</label>
      <div className="t-edit-field">
        <input id="edit-username" value={next} maxLength={32} autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={locked || busy}
          onChange={(event) => { setNext(event.target.value.toLowerCase().replace(/\s/g, '')); setError('') }} />
      </div>
      {next && <div className="t-edit-preview"><span className="t-fine">Your SLUG</span><span className="t-slug-chip">{next}</span></div>}
      <p className="t-fine">{note} Your agents’ SLUGs never change.</p>
      {error && <p className="t-fine t-negative" role="alert">{error}</p>}
      <div className="t-edit-actions">
        <button type="button" className="t-submit t-submit--secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="t-submit" disabled={locked || busy || !next || next === account.username}>{busy ? 'Saving…' : 'Save username'}</button>
      </div>
    </form>}
  </FloatingCard>
}

export const MAX_DISPLAY_NAME = 32

export function EditDisplayName({ current, username, onClose, onSaved }: { current: string | null; username: string | null; onClose: () => void; onSaved: (name: string | null) => void }) {
  const [next, setNext] = useState(current ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const length = [...next.trim()].length
  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    const answer = await saveDisplayName(next)
    setBusy(false)
    if ('error' in answer) return setError(answer.error)
    onSaved(answer.displayName)
    onClose()
  }
  return <FloatingCard title="Edit display name" onClose={onClose} className="t-edit-dialog">
    <form className="t-content-stack" onSubmit={save}>
      <p>Your display name shows above your SLUG on your profile and in lists. Anything goes: spaces, capitals, emoji. It’s only on SLUGS.</p>
      <label htmlFor="edit-display-name">Display name</label>
      <div className="t-edit-field">
        <input id="edit-display-name" value={next} placeholder={username ?? 'Your name'} autoComplete="off" disabled={busy}
          onChange={(event) => { setNext(event.target.value); setError('') }} />
        <span className={`t-fine${length > MAX_DISPLAY_NAME ? ' t-negative' : ''}`}>{length}/{MAX_DISPLAY_NAME}</span>
      </div>
      <div className="t-edit-preview"><strong>{next.trim() || username || 'Your name'}</strong>{username && <span className="t-slug-chip">{username}</span>}</div>
      <p className="t-fine">Leave it empty to show just your SLUG.</p>
      {error && <p className="t-fine t-negative" role="alert">{error}</p>}
      <div className="t-edit-actions">
        <button type="button" className="t-submit t-submit--secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="t-submit" disabled={busy || length > MAX_DISPLAY_NAME || next.trim() === (current ?? '')}>{busy ? 'Saving…' : 'Save name'}</button>
      </div>
    </form>
  </FloatingCard>
}
