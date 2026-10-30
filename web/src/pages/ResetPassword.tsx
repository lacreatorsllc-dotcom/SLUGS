import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { authMessage, sendReset } from '../lib/auth'

export default function ResetPassword() {
  // Carried over from the login form when someone already typed it there.
  const carried = (useLocation().state as { email?: string } | null)?.email ?? ''
  const [email, setEmail] = useState(carried)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return setError('Enter your email.')
    setBusy(true)
    setError(null)
    try {
      await sendReset(email)
      setSentTo(email.trim())
    } catch (err) {
      // Don't reveal whether an account exists for this address.
      if ((err as { code?: string }).code === 'auth/user-not-found') setSentTo(email.trim())
      else setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1>Reset password</h1>
      {sentTo ? (
        <p className="invite-sub auth-sent" role="status">
          If there's a SLUGS account for <strong>{sentTo}</strong>, a reset link is on its way. Check your inbox and spam.
        </p>
      ) : (
        <>
          <p className="invite-sub">Enter your email and we'll send a reset link.</p>
          <form onSubmit={submit} noValidate>
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              placeholder="Enter your email"
              autoComplete="email"
            />
            {error && <p className="down invite-error" role="alert">{error}</p>}
            <button type="submit" className="invite-continue auth-submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        </>
      )}

      <p className="auth-back">
        Remembered your password? <Link to="/login" className="auth-strong">Back to Login</Link>
      </p>
    </AuthLayout>
  )
}
