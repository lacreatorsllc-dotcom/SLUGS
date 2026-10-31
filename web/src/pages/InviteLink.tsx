import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { useAuthSession } from '../lib/auth-context'
import { track } from '../lib/funnel'
import { inviteMessage } from '../lib/invite'

// slugs.run/<code>: a friend's invite link. A real code gives this browser a 7-day guest
// pass and opens the site; the banner there asks them to make their account on Baum.
export default function InviteLink({ code }: { code: string }) {
  const { user, ready, acceptInvite } = useAuthSession()
  const [state, setState] = useState<'checking' | 'in' | string>('checking')
  useEffect(() => {
    if (!ready || user) return
    track('invite_view', { ref: code.toUpperCase() })
    let active = true
    acceptInvite(code)
      .then(() => { if (active) setState('in') })
      .catch((err) => { if (active) setState(inviteMessage(err)) })
    return () => { active = false }
  }, [code, ready, user, acceptInvite])
  if (user || state === 'in') return <Navigate to="/home" replace />
  return (
    <AuthLayout>
      <h1>{state === 'checking' ? 'Opening your invite…' : 'That invite didn’t work'}</h1>
      {state === 'checking'
        ? <p className="invite-sub" role="status">Checking <strong>{code.toUpperCase()}</strong> with Baum.</p>
        : <><p className="down invite-error" role="alert">{state}</p><p className="invite-sub"><Link to="/">Enter a code instead</Link></p></>}
    </AuthLayout>
  )
}
