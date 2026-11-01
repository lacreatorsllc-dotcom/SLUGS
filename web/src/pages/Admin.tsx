import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import AdminInvites from './AdminInvites'
import AdminWaitlist from './AdminWaitlist'
import { BAUM } from '../config'
import { count } from '../lib/terminal-format'
import '../terminal.css'

// The admin page: who opened SLUGS' invite links, the accounts that came of them, and
// the waitlist of people who shilled SLUGS on X (AdminWaitlist.tsx).
// Runs on Baum's partner admin API through api/admin.js. Admins are the Baum account
// holding SLUGS' key (mememarketer). Every sign-in is logged with where it came from.
//
// A report rebuild costs SLUGS 3 Baum credits, so it runs when an admin signs in or
// presses Refresh (at most once a minute) and every 30 minutes while the page is open
// and showing. Baum rebuilds it every 8 hours when nobody has.

type Report = {
  builtAt: string
  codes: { code: string; aliases: string[]; clicks: number; accounts: number }[]
  totals: { clicks: number; direct: number; second: number; admitted: number }
  users: { name: string; wallet: string | null; joinedAt: string; admitted: boolean; code: string; invites: { code: string; clicks: number; accounts: number }[] }[]
}
type Login = { at: string; method: 'baum' | 'device' | 'password'; ok: boolean; who: string | null; ip: string | null; city: string | null; region: string | null; country: string | null; userAgent: string | null; reason?: string }

const AUTO_MS = 30 * 60_000
const GAP_MS = 60_000

async function call(method: 'GET' | 'POST', body?: Record<string, unknown>, action?: string) {
  const res = await fetch(`/api/admin${action ? `?action=${action}` : ''}`, {
    method,
    credentials: 'same-origin',
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
  }).catch(() => null)
  const json = res ? await res.json().catch(() => ({})) : { reason: 'offline' }
  return { status: res?.status ?? 0, json }
}

const REASONS: Record<string, string> = {
  'wrong-email-or-password': 'That email and password don’t match.',
  'too-many-attempts': 'Too many tries. Wait an hour, or approve this device from Telegram.',
  'not-an-admin': 'That Baum account isn’t an admin of SLUGS.',
  'expired-code': 'That link has expired or was already used. Send /admin to Baum for a new one.',
  'bad-code': 'That link has expired or was already used. Send /admin to Baum for a new one.',
  'expired-link': 'That reset link has expired or was already used. Ask for a new one.',
  'out-of-credits': 'SLUGS is out of Baum credits for that. Top up with /apikey in Baum.',
  'not-enabled': 'Turn on personal invites first.',
  'name-needed': 'Say who the invite is for.',
  'not-unused': 'That invite was already used or taken back.',
  'signed-out': 'You’re signed out.',
  'not-configured': 'The admin page isn’t set up on this site yet.',
}
const say = (reason: unknown) => REASONS[String(reason)] ?? (typeof reason === 'string' && reason.includes(' ') ? reason : 'Something went wrong. Try again.')

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const place = (l: Login) => [l.city, l.region, l.country].filter(Boolean).join(', ') || '—'
const METHOD = { baum: 'Baum sign-in', device: 'Approved device', password: 'Email & password' } as const

function SignIn({ onIn }: { onIn: () => void }) {
  const [params, setParams] = useSearchParams()
  const reset = params.get('reset')
  const code = params.get('code')
  const [mode, setMode] = useState<'choose' | 'forgot' | 'waiting'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const tried = useRef(false)

  // A one-time link from Baum (/admin) signs in by itself; so does an existing SLUGS sign-in.
  useEffect(() => {
    if (tried.current) return
    tried.current = true
    if (code) {
      setBusy(true)
      call('POST', { action: 'code', code }).then((r) => {
        setParams({}, { replace: true })
        if (r.status === 200) onIn()
        else { setError(say(r.json.reason)); setBusy(false) }
      })
    } else if (!reset) {
      call('POST', { action: 'baum' }).then((r) => { if (r.status === 200) onIn() })
    }
  }, [code, reset, onIn, setParams])

  // Waiting for Approve in Telegram.
  useEffect(() => {
    if (mode !== 'waiting') return
    const timer = window.setInterval(async () => {
      const r = await call('GET', undefined, 'device')
      if (r.status === 200 && r.json.who !== undefined && r.json.state === undefined) { window.clearInterval(timer); onIn() }
      else if (r.json.state === 'denied') { window.clearInterval(timer); setMode('choose'); setError('That device was denied in Telegram.') }
      else if (r.json.state === 'expired') { window.clearInterval(timer); setMode('choose'); setError('The request expired. Ask again.') }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [mode, onIn])

  async function submit(e: FormEvent, body: Record<string, unknown>) {
    e.preventDefault()
    setBusy(true); setError(null); setNote(null)
    const r = await call('POST', body)
    setBusy(false)
    if (body.action === 'forgot') {
      if (r.status === 200) setNote('If that’s the admin email, a reset link is on its way. It works once, for an hour.')
      else setError(say(r.json.reason))
      return
    }
    if (r.status === 200) { if (reset) setParams({}, { replace: true }); onIn() }
    else setError(say(r.json.reason))
  }

  async function askDevice() {
    setBusy(true); setError(null)
    const r = await call('POST', { action: 'device' })
    setBusy(false)
    if (r.status === 200) setMode('waiting')
    else setError(say(r.json.reason))
  }

  if (reset) {
    return <AuthLayout>
      <h1>New admin password</h1>
      <form onSubmit={(e) => submit(e, { action: 'reset', token: reset, password })}>
        <label htmlFor="pw">New password</label>
        <input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required />
        {error && <p className="down invite-error" role="alert">{error}</p>}
        <button type="submit" className="invite-continue" disabled={busy}>{busy ? 'Saving…' : 'Set password and sign in'}</button>
      </form>
    </AuthLayout>
  }

  if (mode === 'waiting') {
    return <AuthLayout>
      <h1>Approve in Telegram</h1>
      <p className="invite-sub" role="status">Baum sent the admins an Approve button for this device. This page signs in as soon as it’s pressed. The request lasts 10 minutes.</p>
      <button type="button" className="invite-continue" onClick={() => setMode('choose')}>Cancel</button>
    </AuthLayout>
  }

  return <AuthLayout>
    <h1>SLUGS admin</h1>
    {busy && code ? <p className="invite-sub" role="status">Signing you in…</p> : <>
      <p className="invite-sub">For SLUGS’ admins. Every sign-in is logged with where it came from.</p>
      <button type="button" className="invite-continue" onClick={askDevice} disabled={busy}>Approve this device in Telegram</button>
      <p className="note" style={{ marginTop: 8 }}>Or send <strong>/admin</strong> to <a href={`https://t.me/${BAUM.bot}`} target="_blank" rel="noreferrer">Baum</a> for a link straight here.</p>
      <hr />
      {mode === 'forgot'
        ? <form onSubmit={(e) => submit(e, { action: 'forgot', email })}>
            <label htmlFor="email">Admin email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit" className="invite-continue" disabled={busy}>{busy ? 'Sending…' : 'Email me a reset link'}</button>
            <p className="note"><button type="button" className="link-button" onClick={() => setMode('choose')}>Back to sign in</button></p>
          </form>
        : <form onSubmit={(e) => submit(e, { action: 'password', email, password })}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="pw" style={{ marginTop: 12 }}>Password</label>
            <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" className="invite-continue" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <p className="note"><button type="button" className="link-button" onClick={() => setMode('forgot')}>Forgot password?</button></p>
          </form>}
      {note && <p className="auth-sent" role="status">{note}</p>}
      {error && <p className="down invite-error" role="alert">{error}</p>}
    </>}
  </AuthLayout>
}

function Dashboard({ who, onOut }: { who: string | null; onOut: () => void }) {
  const [report, setReport] = useState<Report | null>(null)
  const [logins, setLogins] = useState<Login[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const last = report ? Date.parse(report.builtAt) : 0
  const wait = Math.max(0, last + GAP_MS - now)

  const loadLogins = useCallback(() => call('GET', undefined, 'logins').then((r) => { if (r.status === 200) setLogins(r.json.logins ?? []) }), [])
  const refresh = useCallback(async () => {
    setBusy(true); setError(null)
    const r = await call('POST', { action: 'refresh' })
    setBusy(false)
    if (r.status === 200) setReport(r.json.report)
    else if (r.status === 401) onOut()
    else if (r.json.reason !== 'too-soon') setError(say(r.json.reason))
  }, [onOut])

  // On sign-in: the stored report at once (free), then a fresh one, and the log.
  useEffect(() => {
    call('GET', undefined, 'report').then((r) => { if (r.status === 200 && r.json.report) setReport(r.json.report) })
    refresh()
    loadLogins()
  }, [refresh, loadLogins])
  // Every 30 minutes while the page is open and showing.
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') { refresh(); loadLogins() } }, AUTO_MS)
    return () => window.clearInterval(timer)
  }, [refresh, loadLogins])
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t) }, [])

  async function signOut() { await call('POST', { action: 'logout' }); onOut() }

  return <div className="terminal"><main className="t-main" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
    <div className="t-page-heading">
      <div><h1>SLUGS admin</h1><p>Signed in as {who ?? 'an admin'}. {report ? `Report from ${when(report.builtAt)}.` : 'No report yet.'}</p></div>
      <div className="t-heading-actions">
        <button type="button" className="t-submit" onClick={refresh} disabled={busy || wait > 0} title="Rebuilds the report. Costs SLUGS 3 Baum credits.">
          {busy ? 'Refreshing…' : wait > 0 ? `Refresh in ${Math.ceil(wait / 1000)}s` : 'Refresh · 3 credits'}
        </button>
        <button type="button" className="t-chip" onClick={signOut}>Sign out</button>
      </div>
    </div>
    {error && <p className="t-callout t-callout--error" role="alert">{error}</p>}

    <AdminWaitlist call={call} say={say} onOut={onOut} />
    <AdminInvites call={call} say={say} onOut={onOut} />

    {report && <>
      <dl className="t-stats" style={{ '--stat-count': 4, margin: '16px 0' } as React.CSSProperties}>
        <div className="t-stat"><dt>Invite link visits</dt><dd>{count(report.totals.clicks)}</dd></div>
        <div className="t-stat"><dt>Accounts from SLUGS’ code</dt><dd>{count(report.totals.direct)}</dd><div className="t-stat-note">{count(report.totals.admitted)} let in</div></div>
        <div className="t-stat"><dt>Accounts from their codes</dt><dd>{count(report.totals.second)}</dd></div>
        <div className="t-stat"><dt>Total accounts</dt><dd>{count(report.totals.direct + report.totals.second)}</dd></div>
      </dl>

      <h2>SLUGS’ invite links</h2>
      <div className="t-table-scroll" style={{ marginBottom: 24 }}><table className="t-table"><thead><tr><th>Link</th><th className="t-number">Visits</th><th className="t-number">Accounts</th></tr></thead><tbody>
        {report.codes.map((c) => <tr key={c.code}><td>slugs.run/{c.aliases[0] ?? c.code}{c.aliases.length ? <span className="t-muted"> · {c.code}</span> : null}</td><td className="t-number">{count(c.clicks)}</td><td className="t-number">{count(c.accounts)}</td></tr>)}
      </tbody></table></div>

      <h2>People who came in on SLUGS’ code</h2>
      {report.users.length === 0 ? <p className="t-muted">Nobody yet.</p> :
        <div className="t-table-scroll" style={{ marginBottom: 24 }}><table className="t-table"><thead><tr><th>Who</th><th>Joined</th><th>Status</th><th>Their invite link</th><th className="t-number">Visits</th><th className="t-number">Accounts</th></tr></thead><tbody>
          {report.users.map((u, i) => {
            const visits = u.invites.reduce((n, x) => n + x.clicks, 0)
            const accounts = u.invites.reduce((n, x) => n + x.accounts, 0)
            return <tr key={`${u.wallet ?? u.name}-${i}`}><td title={u.wallet ?? ''}>{u.name}</td><td>{when(u.joinedAt)}</td><td>{u.admitted ? 'In' : 'Waiting'}</td><td>{u.invites[0] ? `slugs.run/${u.invites[0].code}` : '—'}</td><td className="t-number">{count(visits)}</td><td className="t-number">{count(accounts)}</td></tr>
          })}
        </tbody></table></div>}
    </>}

    <h2>Recent sign-ins</h2>
    <div className="t-table-scroll"><table className="t-table"><thead><tr><th>When</th><th>How</th><th>Who</th><th>Where</th><th>IP</th><th>Result</th></tr></thead><tbody>
      {logins.slice(0, 50).map((l, i) => <tr key={`${l.at}-${i}`}><td>{when(l.at)}</td><td>{METHOD[l.method]}</td><td>{l.who ?? '—'}</td><td>{place(l)}</td><td>{l.ip ?? '—'}</td><td className={l.ok ? '' : 't-negative'}>{l.ok ? 'Signed in' : `Refused${l.reason ? ` (${l.reason})` : ''}`}</td></tr>)}
    </tbody></table></div>
  </main></div>
}

export default function Admin() {
  const [me, setMe] = useState<{ who: string | null } | null | undefined>(undefined)
  const check = useCallback(() => call('GET', undefined, 'me').then((r) => setMe(r.status === 200 ? { who: r.json.who ?? null } : null)), [])
  useEffect(() => { check() }, [check])
  useEffect(() => { document.title = 'Admin · SLUGS' }, [])
  if (me === undefined) return <AuthLayout><p className="invite-sub" role="status">Loading…</p></AuthLayout>
  return me ? <Dashboard who={me.who} onOut={() => setMe(null)} /> : <SignIn onIn={check} />
}
