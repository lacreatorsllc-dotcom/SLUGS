import { Link, Navigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { useAuthSession } from '../lib/auth-context'
import { baumLinks } from '../lib/baum'

// A SLUGS account is a Baum account, and Baum lives in Telegram, so that's where you
// log in: Baum sends back a one-time button to /connect-baum. Someone without a Baum
// account yet gets Baum's invite flow from the same link.
export default function Login() {
  const { user, ready } = useAuthSession()
  if (ready && user) return <Navigate to="/home" replace />

  return (
    <AuthLayout>
      <h1>Login</h1>
      <p className="invite-sub">Your SLUGS account is your Baum account. Baum opens in Telegram and sends you a sign-in button.</p>
      <a className="invite-continue auth-baum" href={baumLinks.login()} target="_blank" rel="noreferrer">Log in with Baum</a>
      <div className="auth-links">
        <span>No Baum account yet? Opening Baum gets you in line.</span>
        <span>Have an invite code? <Link to="/" className="auth-strong">Enter it</Link></span>
      </div>
    </AuthLayout>
  )
}
