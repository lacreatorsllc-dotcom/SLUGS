import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ACCESS, BRAND } from '../config'

// The front door: SLUGS is invite only. A code lets you into the platform (/home);
// without one, people enter the access raffle by posting on X or burning the token.
// Codes aren't checked against a list yet. Once in, a visitor skips this page.
const ENTERED = 'slugs.invite'

function remembered() {
  try { return localStorage.getItem(ENTERED) } catch { return null }
}

function remember(code: string) {
  try { localStorage.setItem(ENTERED, code) } catch { /* private mode: they'll see the gate again */ }
}
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
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  if (remembered()) return <Navigate to="/home" replace />

  function enter(value: string) {
    remember(value)
    navigate('/home')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const value = code.trim().toUpperCase()
    if (!value) return setError('Enter your invite code')
    enter(value)
  }

  return (
    <div className="invite">
      <img className="invite-logo" src={`${import.meta.env.BASE_URL}slugs-logo-red.png`} alt={BRAND.name} />

      <div className="invite-card">
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
          <button type="submit" className="invite-continue">Continue</button>
        </form>

        <hr />

        <h2>Don't have an invite code?</h2>
        <p className="invite-sub">Enter our raffle for a chance to win access.</p>

        <div className="raffles">
          <RaffleLink icon={<XMark />} label="Shill us on X" href={shillUrl} />
          <RaffleLink icon={<span className="flame"><Flame /></span>} label="Burn our token" href="/burn" internal />
        </div>

        <p className="invite-foot">or you know... if we like you enough... go fuck yourself.</p>
      </div>

      <p className="invite-login">
        Already have an account? <a href="/home" onClick={(e) => { e.preventDefault(); enter('member') }}>Log in</a>
      </p>
    </div>
  )
}
