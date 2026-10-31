import { useCallback, useEffect, useState } from 'react'
import { count } from '../lib/terminal-format'

// The admin page's waitlist: people who shilled SLUGS on X, from Baum in Telegram or
// this site's popup. Review mode shows them oldest first, one at a time, with their post;
// the admin ticks what the post did and approves or rejects it. Every approved person is
// in the draw with at least one ticket, more for each boost ticked. Draws are by hand
// until an admin turns on the automatic one (one a day, until nobody approved is left);
// once 10 have been approved, the page suggests it.

type Score = { why?: boolean; friend?: boolean; friendWhy?: boolean }
type Applicant = {
  id: string
  handle: string | null
  tweetUrl: string | null
  tweetId: string | null
  appliedAt: string
  source: 'telegram' | 'web'
  contact: { email?: string; telegram?: string } | null
  telegramName: string | null
  score: Score
  tickets: number
}
type Review = {
  pending: Applicant[]
  waiting: (Applicant & { odds: number })[]
  stats: { approvedEver: number; waiting: number; tickets: number; auto: boolean; suggestAuto: boolean; threshold: number }
  rubric: { key: keyof Score; label: string; tickets: number }[]
}
type Drawn = { handle: string | null; tweetUrl: string | null; replyUrl: string | null; accessCode: string | null }
type Stage = { key: string; label: string; count: number }
type Call = (method: 'GET' | 'POST', body?: Record<string, unknown>, action?: string) => Promise<{ status: number; json: Record<string, unknown> }>

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const pct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`
const who = (a: Applicant) => [a.contact?.email, a.contact?.telegram ? `@${a.contact.telegram} on Telegram` : null, a.telegramName].filter(Boolean).join(' · ') || '—'
const ticketsOf = (score: Score, rubric: Review['rubric']) => 1 + rubric.reduce((n, r) => n + (score[r.key] ? r.tickets : 0), 0)

function Post({ a }: { a: Applicant }) {
  if (!a.tweetId) return <p className="t-muted">No post link.</p>
  return <div className="t-tweet">
    <iframe
      key={a.tweetId}
      title={`Post by @${a.handle ?? 'someone'}`}
      src={`https://platform.twitter.com/embed/Tweet.html?id=${a.tweetId}&theme=dark&dnt=true`}
      loading="lazy"
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
    {a.tweetUrl && <a href={a.tweetUrl} target="_blank" rel="noreferrer">Open on X</a>}
  </div>
}

function ReviewMode({ review, call, say, onDone }: { review: Review; call: Call; say: (r: unknown) => string; onDone: () => void }) {
  const [at, setAt] = useState(0)
  const [score, setScore] = useState<Score>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const a = review.pending[at]
  useEffect(() => { setScore(a?.score ?? {}); setError(null) }, [a])

  async function decide(decision: 'approve' | 'reject') {
    if (!a) return
    setBusy(true); setError(null)
    const r = await call('POST', { action: 'review', id: a.id, decision, score })
    setBusy(false)
    if (r.status === 200) setAt((i) => i + 1)
    else setError(say(r.json.reason))
  }

  if (!a) return <div className="t-review"><p>That’s everyone waiting for review.</p><button type="button" className="t-submit" onClick={onDone}>Back to the waitlist</button></div>
  return <div className="t-review">
    <div className="t-page-heading">
      <div><h3>{at + 1} of {review.pending.length}{a.handle ? ` · @${a.handle}` : ''}</h3><p className="t-muted">Applied {when(a.appliedAt)} from {a.source === 'web' ? 'slugs.run' : 'Telegram'} · {who(a)}</p></div>
      <button type="button" className="t-chip" onClick={onDone}>Leave review mode</button>
    </div>
    <Post a={a} />
    <fieldset className="t-review-boxes">
      <legend>What their post did</legend>
      {review.rubric.map((r) => <label key={r.key}>
        <input type="checkbox" checked={Boolean(score[r.key])} onChange={(e) => setScore((s) => ({ ...s, [r.key]: e.target.checked }))} />
        {r.label} <span className="t-muted">+{r.tickets}</span>
      </label>)}
    </fieldset>
    <p>{ticketsOf(score, review.rubric)} ticket{ticketsOf(score, review.rubric) === 1 ? '' : 's'} if approved.</p>
    {error && <p className="t-callout t-callout--error" role="alert">{error}</p>}
    <div className="t-heading-actions">
      <button type="button" className="t-submit" onClick={() => decide('approve')} disabled={busy}>Approve</button>
      <button type="button" className="t-submit t-submit--secondary" onClick={() => decide('reject')} disabled={busy}>Reject</button>
      <button type="button" className="t-chip" onClick={() => setAt((i) => i + 1)} disabled={busy}>Skip</button>
    </div>
  </div>
}

export default function AdminWaitlist({ call, say, onOut }: { call: Call; say: (r: unknown) => string; onOut: () => void }) {
  const [review, setReview] = useState<Review | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [drawn, setDrawn] = useState<Drawn | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [r, f] = await Promise.all([call('GET', undefined, 'review'), call('GET', undefined, 'funnel')])
    if (r.status === 401) return onOut()
    if (r.status === 200) setReview(r.json as unknown as Review)
    else setError(say(r.json.reason))
    if (f.status === 200) setStages((f.json.stages as Stage[]) ?? [])
  }, [call, say, onOut])
  useEffect(() => { load() }, [load])

  async function draw() {
    if (!window.confirm('Draw a winner now? They’re let in straight away.')) return
    setBusy(true); setError(null)
    const r = await call('POST', { action: 'draw' })
    setBusy(false)
    if (r.status === 200 && r.json.drawn) setDrawn(r.json.drawn as Drawn)
    else if (r.json.idle === 'nobody-waiting') setError('Nobody approved is waiting.')
    else setError(say(r.json.reason))
    load()
  }

  async function setAuto(on: boolean) {
    setBusy(true); setError(null)
    const r = await call('POST', { action: 'auto', on })
    setBusy(false)
    if (r.status !== 200) setError(say(r.json.reason))
    load()
  }

  if (reviewing && review) return <section className="t-waitlist"><h2>Review mode</h2><ReviewMode review={review} call={call} say={say} onDone={() => { setReviewing(false); load() }} /></section>

  const s = review?.stats
  return <section className="t-waitlist">
    <div className="t-page-heading">
      <div><h2>Waitlist</h2><p className="t-muted">People who shilled SLUGS on X. Approve them, then draw: more tickets, better odds.</p></div>
      {review && <div className="t-heading-actions">
        <button type="button" className="t-submit" onClick={() => setReviewing(true)} disabled={review.pending.length === 0}>Review mode{review.pending.length ? ` · ${review.pending.length}` : ''}</button>
        <button type="button" className="t-submit t-submit--secondary" onClick={draw} disabled={busy || !s?.waiting}>Draw a winner</button>
        <label className="t-chip t-auto"><input type="checkbox" checked={Boolean(s?.auto)} onChange={(e) => setAuto(e.target.checked)} disabled={busy} /> Automatic daily draw</label>
      </div>}
    </div>
    {error && <p className="t-callout t-callout--error" role="alert">{error}</p>}
    {s?.suggestAuto && !s.auto && <div className="t-callout"><div>{s.threshold}+ people approved. Turn on automatic daily draws? One a day is let in until nobody approved is left, or you turn it off.</div><button type="button" className="t-chip" onClick={() => setAuto(true)} disabled={busy}>Turn on</button></div>}
    {drawn && <div className="t-callout"><div>
      <strong>{drawn.handle ? `@${drawn.handle}` : 'Somebody'} won.</strong>{' '}
      {drawn.accessCode ? <>Their access code: <code>{drawn.accessCode}</code>. </> : 'They’re in, and Baum told them in Telegram. '}
      {drawn.replyUrl ? <a href={drawn.replyUrl} target="_blank" rel="noreferrer">Open reply on X</a> : drawn.tweetUrl ? <a href={drawn.tweetUrl} target="_blank" rel="noreferrer">Their post</a> : null}
    </div></div>}

    {s && <dl className="t-stats" style={{ '--stat-count': 4, margin: '16px 0' } as React.CSSProperties}>
      <div className="t-stat"><dt>To review</dt><dd>{count(review!.pending.length)}</dd></div>
      <div className="t-stat"><dt>Approved, waiting</dt><dd>{count(s.waiting)}</dd><div className="t-stat-note">{count(s.tickets)} tickets</div></div>
      <div className="t-stat"><dt>Approved ever</dt><dd>{count(s.approvedEver)}</dd></div>
      <div className="t-stat"><dt>Draws</dt><dd>{s.auto ? 'Daily' : 'By hand'}</dd></div>
    </dl>}

    {review && review.waiting.length > 0 && <div className="t-table-scroll" style={{ marginBottom: 24 }}><table className="t-table"><thead><tr><th>Who</th><th>Post</th><th>Applied</th><th>Contact</th><th className="t-number">Tickets</th><th className="t-number">Odds</th></tr></thead><tbody>
      {review.waiting.map((a) => <tr key={a.id}><td>{a.handle ? `@${a.handle}` : '—'}</td><td>{a.tweetUrl ? <a href={a.tweetUrl} target="_blank" rel="noreferrer">Open</a> : '—'}</td><td>{when(a.appliedAt)}</td><td>{who(a)}</td><td className="t-number">{a.tickets}</td><td className="t-number">{pct(a.odds)}</td></tr>)}
    </tbody></table></div>}

    {stages.length > 0 && <>
      <h2>How people get in</h2>
      <div className="t-table-scroll" style={{ marginBottom: 24 }}><table className="t-table t-table--narrow"><thead><tr><th>Step</th><th className="t-number">People</th></tr></thead><tbody>
        {stages.map((st) => <tr key={st.key}><td>{st.label}</td><td className="t-number">{count(st.count)}</td></tr>)}
      </tbody></table></div>
    </>}
  </section>
}
