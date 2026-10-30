import { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { signInMessage } from '../lib/auth'
import { useAuthSession } from '../lib/auth-context'
import { baumLinks } from '../lib/baum'

// Where Baum's sign-in button lands: /connect-baum?code=<one-time code>.
export default function ConnectBaum() {
  const { user, signIn } = useAuthSession()
  const code = useSearchParams()[0].get('code') ?? ''
  const [error, setError] = useState<string | null>(code ? null : signInMessage({ reason: 'bad-code' }))
  // A code works once, so don't spend it twice (React runs effects twice in development).
  const tried = useRef(false)
  useEffect(() => {
    if (!code || tried.current) return
    tried.current = true
    signIn(code).catch((err) => setError(signInMessage(err)))
  }, [code, signIn])

  if (user) return <Navigate to="/home" replace />

  return (
    <AuthLayout>
      <h1>Login</h1>
      {error ? (
        <>
          <p className="down invite-error" role="alert">{error}</p>
          <a className="invite-continue auth-baum" href={baumLinks.login()} target="_blank" rel="noreferrer">Get a new link from Baum</a>
        </>
      ) : (
        <p className="invite-sub" role="status">Signing you in with Baum…</p>
      )}
    </AuthLayout>
  )
}
