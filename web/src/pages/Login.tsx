import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import ShillPopup from '../components/ShillPopup'
import SignInWithBaum from '../components/SignInWithBaum'
import { useAuthSession } from '../lib/auth-context'

// SLUGS is its own app, built on Baum, and uses Baum for accounts the way other apps
// use Google or X. Baum lives in Telegram, so signing in opens it there and it sends a
// one-time button back to /connect-baum. Someone without a Baum account gets Baum's
// invite flow from the same link.
export default function Login() {
  const { user, ready } = useAuthSession()
  const [shill, setShill] = useState(false)
  if (ready && user) return <Navigate to="/home" replace />

  return (
    <AuthLayout
      below={<p className="auth-built-on">SLUGS is an independent app built on <a href="https://baumai.xyz" target="_blank" rel="noreferrer">Baum</a>. Baum handles sign-in and trading. SLUGS never sees your keys.</p>}
    >
      <h1>Log in to SLUGS</h1>
      <p className="invite-sub">Use your Baum account. Baum opens in Telegram and sends you a one-time sign-in button.</p>
      <SignInWithBaum />
      <div className="auth-links">
        <span>No Baum account? Signing in with Baum starts one. SLUGS is invite only, so <Link to="/" className="auth-strong">bring an invite code</Link>, or <button type="button" className="link-button auth-strong" onClick={() => setShill(true)}>shill us on X</button>.</span>
        <span>Baum’s sign-in link opened in Telegram’s browser? <Link to="/" className="auth-strong">Paste it here</Link></span>
      </div>
      {shill && <ShillPopup onClose={() => setShill(false)} />}
    </AuthLayout>
  )
}
