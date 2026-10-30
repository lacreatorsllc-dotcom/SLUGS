import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { authMessage } from '../lib/auth'
import { useAuthSession } from '../lib/auth-context'

function EyeToggle({ shown }: { shown: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!shown && <path d="M4 20 20 4" />}
    </svg>
  )
}

export default function Login() {
  const { user, ready, signIn } = useAuthSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Enter your email and password.')
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (ready && user) return <Navigate to="/home" replace />

  return (
    <AuthLayout>
      <h1>Login</h1>
      <p className="invite-sub">Sign in to continue</p>

      <form onSubmit={submit} noValidate>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null) }}
          placeholder="Enter your email"
          autoComplete="email"
          disabled={busy}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-error' : undefined}
        />

        <label htmlFor="login-password" className="auth-label">Password</label>
        <div className="auth-password">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null) }}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={busy}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
          />
          <button
            type="button"
            className="auth-eye"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <EyeToggle shown={showPassword} />
          </button>
        </div>

        {error && <p id="login-error" className="down invite-error" role="alert">{error}</p>}
        <button type="submit" className="invite-continue" disabled={busy} aria-busy={busy}>{busy ? 'Signing in…' : 'Login'}</button>
      </form>

      <div className="auth-links">
        <Link to="/reset-password" state={{ email }}>Forgot Password?</Link>
        <span>Don't have an account? <Link to="/" className="auth-strong">Sign up</Link></span>
      </div>
    </AuthLayout>
  )
}
