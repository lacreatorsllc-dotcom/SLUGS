import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { authMessage, signIn } from '../lib/auth'

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
  const navigate = useNavigate()
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
      navigate('/home')
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

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

        {error && <p className="down invite-error" role="alert">{error}</p>}
        <button type="submit" className="invite-continue" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
      </form>

      <div className="auth-links">
        <Link to="/reset-password" state={{ email }}>Forgot Password?</Link>
        <span>Don't have an account? <Link to="/" className="auth-strong">Sign up</Link></span>
      </div>
    </AuthLayout>
  )
}
