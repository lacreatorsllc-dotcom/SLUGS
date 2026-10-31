import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BRAND } from '../config'
import { track } from '../lib/funnel'
import { BASE_TICKETS, BOOSTS, looksLikeEmail, postIntent, postUrlFrom, shillPost, telegramFrom, ticketsFor, type Boosts } from '../lib/shill'

// "Shill us on X", for anybody without an invite code. They write the post here (each
// boost adds tickets), post it on X, then come back with the link and an email or
// Telegram username. We pick at least one post a day and reply to the winner on X.
// What the boosts are worth: lib/shill.ts.

const REASONS: Record<string, string> = {
  'not-a-post': 'That isn’t a link to a post on X.',
  'need-contact': 'Add an email or a Telegram username, so we can tell you if you’re picked.',
  'bad-email': 'That email doesn’t look right.',
  'already-applied': 'We already have that post. You’re in the line.',
}
const say = (reason: unknown) => REASONS[String(reason)] ?? 'Something went wrong. Try again.'

export default function ShillPopup({ onClose }: { onClose: () => void }) {
  const [boosts, setBoosts] = useState<Boosts>({ why: '', friend: '', friendWhy: '' })
  const [step, setStep] = useState<'write' | 'link' | 'done'>('write')
  const [link, setLink] = useState('')
  const [email, setEmail] = useState('')
  const [telegram, setTelegram] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const post = shillPost(boosts, BRAND.x)
  const tickets = ticketsFor(boosts)

  useEffect(() => {
    track('popup_open')
    panel.current?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  const set = (key: keyof Boosts) => (value: string) => setBoosts((b) => ({ ...b, [key]: value }))

  function postToX() {
    track('post_click')
    window.open(postIntent(post), '_blank', 'noopener,noreferrer')
    setStep('link')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const tweetUrl = postUrlFrom(link)
    if (!tweetUrl) return setError(say('not-a-post'))
    const tg = telegram.trim() ? telegramFrom(telegram) : ''
    if (telegram.trim() && !tg) return setError('That Telegram username doesn’t look right.')
    if (email.trim() && !looksLikeEmail(email)) return setError(say('bad-email'))
    if (!email.trim() && !tg) return setError(say('need-contact'))
    setBusy(true); setError(null)
    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tweetUrl, ...(email.trim() ? { email: email.trim() } : {}), ...(tg ? { telegram: tg } : {}) }),
    }).catch(() => null)
    const json = res ? await res.json().catch(() => ({})) : {}
    setBusy(false)
    if (res?.ok || json.reason === 'already-applied') {
      track('link_sent')
      setStep('done')
    } else setError(res?.status === 429 ? 'Too many tries. Wait a bit and send it again.' : say(json.reason))
  }

  const contact = email.trim() && telegramFrom(telegram) ? 'your email or Telegram' : email.trim() ? 'your email' : 'Telegram'

  return (
    <div className="shill-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="shill invite-card" role="dialog" aria-modal="true" aria-labelledby="shill-title" tabIndex={-1} ref={panel}>
        <button type="button" className="shill-close" onClick={onClose} aria-label="Close">×</button>

        {step === 'write' && <>
          <h2 id="shill-title">Shill us on X</h2>
          <p className="invite-sub">No invite code? Post about SLUGS on X and send us the link. We pick at least one post a day and reply to the winner.</p>
          <p className="shill-odds">Every approved post gets {BASE_TICKETS} ticket. Each boost adds more: more tickets, better odds, and everyone approved has a chance.</p>

          <label htmlFor="shill-why">{BOOSTS[0].label} <span className="shill-plus">+{BOOSTS[0].tickets}</span></label>
          <input id="shill-why" value={boosts.why} onChange={(e) => set('why')(e.target.value)} placeholder="I want to run my own trading agent" maxLength={140} />
          <label htmlFor="shill-friend">{BOOSTS[1].label} <span className="shill-plus">+{BOOSTS[1].tickets}</span></label>
          <input id="shill-friend" value={boosts.friend} onChange={(e) => set('friend')(e.target.value)} placeholder="@friend" maxLength={40} autoCapitalize="off" spellCheck={false} />
          <label htmlFor="shill-friend-why">{BOOSTS[2].label} <span className="shill-plus">+{BOOSTS[2].tickets}</span></label>
          <input id="shill-friend-why" value={boosts.friendWhy} onChange={(e) => set('friendWhy')(e.target.value)} placeholder="you'd out-trade all of us" maxLength={140} />

          <div className="shill-preview" aria-label="Your post">{post}</div>
          <p className="shill-count">{tickets} ticket{tickets === 1 ? '' : 's'} if it’s approved · {post.length}/280</p>
          <button type="button" className="invite-continue" onClick={postToX} disabled={post.length > 280}>Post to X</button>
          <p className="note"><button type="button" className="link-button" onClick={() => setStep('link')}>Already posted? Send us the link</button></p>
        </>}

        {step === 'link' && <form onSubmit={submit}>
          <h2 id="shill-title">Send us your post</h2>
          <p className="invite-sub">Paste the link to your post, and tell us where to send your access code if you’re picked.</p>
          <label htmlFor="shill-link" className="auth-label">Link to your post</label>
          <input id="shill-link" value={link} onChange={(e) => { setLink(e.target.value); setError(null) }} placeholder="https://x.com/you/status/…" inputMode="url" autoCapitalize="off" spellCheck={false} required />
          <label htmlFor="shill-email" className="auth-label">Email</label>
          <input id="shill-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null) }} placeholder="you@example.com" autoComplete="email" />
          <label htmlFor="shill-tg" className="auth-label">or Telegram username</label>
          <input id="shill-tg" value={telegram} onChange={(e) => { setTelegram(e.target.value); setError(null) }} placeholder="@you" autoCapitalize="off" spellCheck={false} />
          {error && <p className="down invite-error" role="alert">{error}</p>}
          <button type="submit" className="invite-continue" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
          <p className="note"><button type="button" className="link-button" onClick={() => setStep('write')}>Back to your post</button></p>
        </form>}

        {step === 'done' && <>
          <h2 id="shill-title">Got it</h2>
          <p className="invite-sub" role="status">You’re in the line. If you’re picked, we’ll reply to your post on X and send your access code to {contact}.</p>
          <button type="button" className="invite-continue" onClick={onClose}>Done</button>
        </>}
      </div>
    </div>
  )
}
