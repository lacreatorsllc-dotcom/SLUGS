import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ACCESS } from '../config'
import AuthLayout from '../components/AuthLayout'
import { useAuthSession } from '../lib/auth-context'
import { signInCodeFrom, signInMessage } from '../lib/auth'
import { inviteMessage } from '../lib/invite'

// The front door: SLUGS is invite only. Without a code, people enter the access raffle
// by posting on X or burning the token. An invite code is a Baum referral code: a real
// one lets them in as a guest for 7 days, and they make their account on Baum to stay. The same box
// takes a sign-in link from Baum, pasted, which signs this browser in.
const shillUrl = `https://x.com/intent/post?text=${encodeURIComponent(ACCESS.applyPost)}`

function XMark() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
      <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function Flame() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <path fill="currentColor" d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67M11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8" />
    </svg>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function RaffleLink({ icon, label, href, internal }: { icon: ReactNode; label: string; href: string; internal?: boolean }) {
  const body = (
    <>
      <span className="raffle-icon">{icon}</span>
      <span className="raffle-label">{label}</span>
      <Arrow />
    </>
  )
  return internal
    ? <Link className="raffle" to={href}>{body}</Link>
    : <a className="raffle" href={href} target="_blank" rel="noreferrer">{body}</a>
}

export default function Invite() {
  const { user, guest, ready, signIn, acceptInvite } = useAuthSession()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const signInCode = signInCodeFrom(code)
    if (signInCode) {
      setBusy(true)
      setError(null)
      try {
        await signIn(signInCode)
      } catch (err) {
        setError(signInMessage(err))
      } finally {
        setBusy(false)
      }
      return
    }
    const value = code.trim().toUpperCase()
    if (!value) return setError('Enter your invite code')
    if (!/^[A-Z0-9-]{3,40}$/.test(value)) return setError('That doesn’t look like an invite code')
    // A real code lets this browser in as a guest for 7 days; the site then asks them
    // to make their account on Baum (lib/invite.ts).
    setBusy(true)
    setError(null)
    try {
      await acceptInvite(value)
    } catch (err) {
      setError(inviteMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (ready && (user || guest)) return <Navigate to="/home" replace />

  return (
    <AuthLayout
      below={
        <p className="invite-login">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      }
    >
      <h1>Create Account</h1>
      <p className="invite-sub">Enter your invite code to get access to SLUGS.</p>

      <form onSubmit={submit}>
        <label htmlFor="invite-code">Invite Code</label>
        <input
          id="invite-code"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(null) }}
          placeholder="e.g. SLUGS-A3X7K2B9"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        {error && <p className="down invite-error">{error}</p>}
        <button type="submit" className="invite-continue" disabled={busy}>{busy ? 'Signing in…' : 'Continue'}</button>
      </form>

      <hr />

      <h2>Don't have an invite code?</h2>
      <p className="invite-sub">Enter a raffle for a chance to win access</p>

      <div className="raffles">
        <RaffleLink icon={<XMark />} label="Shill us on X" href={shillUrl} />
        <RaffleLink icon={<span className="flame"><Flame /></span>} label="Burn our token" href="/burn" internal />
      </div>
    </AuthLayout>
  )
}
