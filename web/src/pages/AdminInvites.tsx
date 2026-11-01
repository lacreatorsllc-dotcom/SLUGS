import { useEffect, useState, type FormEvent } from 'react'
import { BOT_CATALOG, DEFAULT_PROFILES, cardUrl, pictureOf, type InvitationProfile } from '../lib/invitation'

// Personal invitations, on the admin page: who it's for, a note, the bots to suggest and
// the profiles their welcome tour shows. api/admin.js signs it into a link
// (server/invitation.js); nothing is stored on a server. Invitations made here are
// listed in this browser so they can be copied again.

type Call = (method: 'GET' | 'POST', body?: Record<string, unknown>, action?: string) => Promise<{ status: number; json: Record<string, unknown> }>
type Made = { to: string; url: string; token: string; at: number }

const HISTORY = 'slugs.admin.invitations'
const LAST = 'slugs.admin.invitation-defaults'
const MAX_BOTS = 4
const MAX_PROFILES = 8
const BOT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function store(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* this browser won't remember it */ }
}

/** A username's wallet from the leaderboard, for their Baum picture; null when they're not on it. */
async function walletOf(username: string): Promise<string | null> {
  const res = await fetch('/data/leaderboard-all.json').catch(() => null)
  const board = res?.ok ? await res.json().catch(() => null) : null
  const row = (board?.rows ?? []).find((item: { username?: string }) => item.username?.toLowerCase() === username.toLowerCase())
  return row?.wallet?.toLowerCase() ?? null
}

function Face({ profile }: { profile: InvitationProfile }) {
  const src = pictureOf(profile)
  const [broken, setBroken] = useState(false)
  return src && !broken
    ? <img className="t-invite-face" src={src} alt="" onError={() => setBroken(true)} />
    : <span className="t-invite-face">{profile.u.slice(0, 2).toUpperCase()}</span>
}

export default function AdminInvites({ call, say, onOut }: { call: Call; say: (reason: unknown) => string; onOut: () => void }) {
  const last = load(LAST, { from: 'goobz', code: 'GOOBZ' })
  const [to, setTo] = useState('')
  const [handle, setHandle] = useState('')
  const [note, setNote] = useState('')
  const [from, setFrom] = useState(last.from)
  const [code, setCode] = useState(last.code)
  const [bots, setBots] = useState<string[]>(['dca-bot'])
  const [customBot, setCustomBot] = useState('')
  const [profiles, setProfiles] = useState<InvitationProfile[]>(DEFAULT_PROFILES)
  const [newUser, setNewUser] = useState('')
  const [newBot, setNewBot] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [made, setMade] = useState<Made | null>(null)
  const [history, setHistory] = useState<Made[]>(() => load(HISTORY, []))
  const [copied, setCopied] = useState('')
  useEffect(() => { if (!copied) return; const t = window.setTimeout(() => setCopied(''), 2000); return () => window.clearTimeout(t) }, [copied])

  const toggleBot = (bot: string) => setBots((list) => (list.includes(bot) ? list.filter((item) => item !== bot) : list.length >= MAX_BOTS ? list : [...list, bot]))
  function addBot() {
    const bot = customBot.trim().toLowerCase().replace(/\s+/g, '-')
    if (!BOT.test(bot)) return setError('Name bots like dca-bot: lowercase letters, numbers and hyphens.')
    if (!bots.includes(bot) && bots.length < MAX_BOTS) setBots([...bots, bot])
    setCustomBot(''); setError('')
  }
  const move = (index: number, by: number) => setProfiles((list) => {
    const next = [...list]
    const [item] = next.splice(index, 1)
    next.splice(Math.max(0, Math.min(next.length, index + by)), 0, item)
    return next
  })
  async function addProfile() {
    const u = newUser.trim().replace(/^@/, '')
    const a = newBot.trim().toLowerCase().replace(/\s+/g, '-')
    if (!/^[A-Za-z0-9_]{1,30}$/.test(u) || !BOT.test(a)) return setError('Add a username and a bot named like dca-bot.')
    if (profiles.some((profile) => profile.u.toLowerCase() === u.toLowerCase())) return setError(`${u} is already in the list.`)
    setAdding(true); setError('')
    const w = await walletOf(u)
    setAdding(false)
    setProfiles([...profiles, w ? { u, a, w } : { u, a }].slice(0, MAX_PROFILES))
    setNewUser(''); setNewBot('')
    if (!w) setError(`${u} isn’t on the leaderboard, so they’ll show with initials instead of a picture.`)
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    const r = await call('POST', { action: 'invitation', to, handle, note, from, code, bots, profiles })
    setBusy(false)
    if (r.status === 401) return onOut()
    if (r.status !== 200) return setError(say(r.json.reason))
    const result = { to, url: String(r.json.url), token: String(r.json.token), at: Date.now() }
    setMade(result)
    const next = [result, ...history].slice(0, 30)
    setHistory(next); store(HISTORY, next); store(LAST, { from, code })
  }
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(url) } catch { setError('Couldn’t copy. Select the link and copy it.') }
  }
  const shareText = made ? `${made.to}, you’re invited to SLUGS` : ''

  return <section className="t-feature-card t-invites" aria-label="Personal invitations">
    <div className="t-section-title"><h2>Personal invitations</h2><span className="t-tag">ONLY YOU</span></div>
    <p>Make an invite link for one person: your note, the bots to suggest and the profiles their welcome tour shows. It uses your invite code, so their account counts as your invite.</p>
    <form className="t-invites-form" onSubmit={create}>
      <div className="t-invites-grid">
        <label>Their name<input value={to} maxLength={40} placeholder="Alex" onChange={(e) => setTo(e.target.value)} required /></label>
        <label><span>Their @handle <span className="t-faint">optional</span></span><input value={handle} maxLength={31} placeholder="@alex" onChange={(e) => setHandle(e.target.value)} /></label>
        <label>From<input value={from} maxLength={30} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Invite code<input value={code} maxLength={40} onChange={(e) => setCode(e.target.value.toUpperCase())} /></label>
      </div>
      <label><span>Note <span className="t-faint">{[...note].length}/160</span></span><textarea value={note} maxLength={160} rows={2} placeholder="Saw your calls on X. Thought you'd like a bot doing it for you." onChange={(e) => setNote(e.target.value)} /></label>

      <div className="t-invites-block">
        <span className="t-invites-label">Bots to suggest <span className="t-faint">· up to {MAX_BOTS}, first one is their starting name on Deploy</span></span>
        <div className="t-invites-chips">{[...BOT_CATALOG, ...bots.filter((bot) => !BOT_CATALOG.includes(bot))].map((bot) =>
          <button type="button" key={bot} className="t-chip" aria-pressed={bots.includes(bot)} onClick={() => toggleBot(bot)}>{bots.includes(bot) ? `${bots.indexOf(bot) + 1}. ` : ''}{bot}</button>)}</div>
        <div className="t-invites-inline"><input value={customBot} placeholder="Another bot, like whale-watcher" onChange={(e) => setCustomBot(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBot() } }} /><button type="button" className="t-chip" onClick={addBot} disabled={!customBot.trim()}>Add bot</button></div>
      </div>

      <div className="t-invites-block">
        <span className="t-invites-label">Profiles on their welcome tour <span className="t-faint">· the first shows alone, then the rest rotate · up to {MAX_PROFILES}</span></span>
        <ol className="t-invites-profiles">{profiles.map((profile, index) => <li key={profile.u}>
          <Face profile={profile} />
          <span className="t-invites-slug"><b>{profile.u}</b>/<input aria-label={`${profile.u}'s bot`} value={profile.a} onChange={(e) => setProfiles(profiles.map((item, i) => (i === index ? { ...item, a: e.target.value.toLowerCase().replace(/\s+/g, '-') } : item)))} /></span>
          <span className="t-invites-actions">
            <button type="button" className="t-chip" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${profile.u} up`}>↑</button>
            <button type="button" className="t-chip" onClick={() => move(index, 1)} disabled={index === profiles.length - 1} aria-label={`Move ${profile.u} down`}>↓</button>
            <button type="button" className="t-chip" onClick={() => setProfiles(profiles.filter((_, i) => i !== index))} disabled={profiles.length === 1} aria-label={`Remove ${profile.u}`}>Remove</button>
          </span>
        </li>)}</ol>
        <div className="t-invites-inline">
          <input value={newUser} placeholder="Username, like brokentyrant" onChange={(e) => setNewUser(e.target.value)} />
          <input value={newBot} placeholder="Their bot, like sniper-bot" onChange={(e) => setNewBot(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProfile() } }} />
          <button type="button" className="t-chip" onClick={addProfile} disabled={adding || profiles.length >= MAX_PROFILES || !newUser.trim()}>{adding ? 'Looking up…' : 'Add profile'}</button>
          <button type="button" className="t-chip" onClick={() => setProfiles(DEFAULT_PROFILES)}>Reset</button>
        </div>
      </div>

      {error && <p className="t-fine t-negative" role="alert">{error}</p>}
      <button type="submit" className="t-submit" disabled={busy || !to.trim()}>{busy ? 'Making the link…' : 'Make invite link and card'}</button>
    </form>

    {made && <div className="t-invites-made">
      <img src={cardUrl(made.token)} alt={`Invitation card for ${made.to}`} width="1200" height="630" />
      <div className="t-invites-share">
        <code>{made.url.replace('https://', '')}</code>
        <button type="button" className="t-submit" onClick={() => copy(made.url)}>{copied === made.url ? 'Copied' : 'Copy link'}</button>
        <a className="t-submit t-submit--secondary" href={cardUrl(made.token, true)} download>Download card</a>
        <a className="t-submit t-submit--secondary" href={`https://x.com/intent/post?${new URLSearchParams({ text: shareText, url: made.url })}`} target="_blank" rel="noreferrer">Post on X</a>
        <a className="t-submit t-submit--secondary" href={`https://t.me/share/url?${new URLSearchParams({ url: made.url, text: shareText })}`} target="_blank" rel="noreferrer">Telegram</a>
      </div>
      <p className="t-fine">Pasting the link into X, Telegram or a DM shows the card as its preview. It opens on their invite, greets them by name and sets up their welcome tour.</p>
    </div>}

    {history.length > 0 && <details className="t-invites-history"><summary>Invites made in this browser ({history.length})</summary>
      <ul>{history.map((item) => <li key={item.token}><span>{item.to}</span><span className="t-faint">{new Date(item.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span><button type="button" className="t-chip" onClick={() => copy(item.url)}>{copied === item.url ? 'Copied' : 'Copy link'}</button></li>)}</ul>
    </details>}
  </section>
}
