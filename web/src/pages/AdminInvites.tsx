import { useCallback, useEffect, useState, type FormEvent } from 'react'

// Personal invites: one-time links an admin makes for someone they name. Whoever opens
// one gets into SLUGS and Baum, and counts as SLUGS' referral. Turning them on costs
// SLUGS Baum credits once, and each invite costs credits too; Baum sets the prices
// and sends them with the list.

type Invite = {
  code: string
  name: string
  note: string | null
  status: 'unused' | 'used' | 'revoked'
  createdAt: string
  usedAt: string | null
  usedBy: string | null
  links: { telegram: string; site: string | null }
}
type List = { enabled: boolean; prices: { enable: number; invite: number }; invites: Invite[] }
type Call = (method: 'GET' | 'POST', body?: Record<string, unknown>, action?: string) => Promise<{ status: number; json: Record<string, unknown> }>

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setDone(true); window.setTimeout(() => setDone(false), 1500) } catch { window.prompt('Copy this link', text) }
  }
  return <button type="button" className="t-chip" onClick={copy}>{done ? 'Copied' : label}</button>
}

export default function AdminInvites({ call, say, onOut }: { call: Call; say: (r: unknown) => string; onOut: () => void }) {
  const [list, setList] = useState<List | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [made, setMade] = useState<Invite | null>(null)

  const load = useCallback(async () => {
    const r = await call('GET', undefined, 'invites')
    if (r.status === 401) return onOut()
    if (r.status === 200) setList(r.json as unknown as List)
    else setError(say(r.json.reason))
  }, [call, say, onOut])
  useEffect(() => { load() }, [load])

  async function enable() {
    if (!list || !window.confirm(`Turn on personal invites? It costs SLUGS ${list.prices.enable.toLocaleString()} Baum credits, once.`)) return
    setBusy(true); setError(null)
    const r = await call('POST', { action: 'invites-enable' })
    setBusy(false)
    if (r.status !== 200) setError(say(r.json.reason))
    load()
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null); setMade(null)
    const r = await call('POST', { action: 'invite-create', name, note })
    setBusy(false)
    if (r.status === 200 && r.json.invite) { setMade(r.json.invite as Invite); setName(''); setNote('') }
    else setError(say(r.json.reason))
    load()
  }

  async function revoke(i: Invite) {
    if (!window.confirm(`Take back the invite for ${i.name}? Its credits aren’t refunded.`)) return
    setBusy(true); setError(null)
    const r = await call('POST', { action: 'invite-revoke', code: i.code })
    setBusy(false)
    if (r.status !== 200) setError(say(r.json.reason))
    load()
  }

  if (!list) return error ? <section className="t-waitlist"><h2>Personal invites</h2><p className="t-callout t-callout--error" role="alert">{error}</p></section> : null
  const linkOf = (i: Invite) => i.links.site ?? i.links.telegram

  return <section className="t-waitlist">
    <div className="t-page-heading">
      <div><h2>Personal invites</h2><p className="t-muted">A one-time link for someone you choose. Opening it lets them into SLUGS and Baum, and counts as SLUGS’ referral.</p></div>
      {!list.enabled && <div className="t-heading-actions">
        <button type="button" className="t-submit" onClick={enable} disabled={busy}>Turn on · {list.prices.enable.toLocaleString()} credits</button>
      </div>}
    </div>
    {error && <p className="t-callout t-callout--error" role="alert">{error}</p>}

    {list.enabled && <form className="t-form" onSubmit={create} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', margin: '12px 0' }}>
      <label>Who it’s for<br /><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="Their name" /></label>
      <label>Note (only you see it)<br /><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="Optional" /></label>
      <button type="submit" className="t-submit" disabled={busy || !name.trim()}>Make invite · {list.prices.invite} credits</button>
    </form>}

    {made && <div className="t-callout"><div>
      <strong>Invite for {made.name}:</strong> <code>{linkOf(made)}</code>{' '}
      <Copy text={linkOf(made)} label="Copy link" />
      {made.links.site && <> <Copy text={made.links.telegram} label="Copy Telegram link" /></>}
    </div></div>}

    {list.invites.length > 0 && <div className="t-table-scroll" style={{ marginBottom: 24 }}><table className="t-table"><thead><tr><th>For</th><th>Made</th><th>Status</th><th>Link</th><th /></tr></thead><tbody>
      {list.invites.map((i) => <tr key={i.code}>
        <td>{i.name}{i.note ? <span className="t-muted"> · {i.note}</span> : null}</td>
        <td>{when(i.createdAt)}</td>
        <td>{i.status === 'used' ? `Used by ${i.usedBy ?? 'someone'}${i.usedAt ? `, ${when(i.usedAt)}` : ''}` : i.status === 'revoked' ? 'Taken back' : 'Not used yet'}</td>
        <td>{i.status === 'unused' ? <><Copy text={linkOf(i)} label="Copy link" />{i.links.site && <> <Copy text={i.links.telegram} label="Telegram" /></>}</> : <code>{i.code}</code>}</td>
        <td>{i.status === 'unused' && <button type="button" className="t-chip" onClick={() => revoke(i)} disabled={busy}>Take back</button>}</td>
      </tr>)}
    </tbody></table></div>}
  </section>
}
