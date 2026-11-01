import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { useAuthSession } from '../lib/auth-context'
import { track } from '../lib/funnel'
import { cardUrl, openInvitation, type Invitation } from '../lib/invitation'
import { inviteMessage } from '../lib/invite'

// slugs.run/<code>: a friend's invite link. A real code gives this browser a 7-day guest
// pass and opens the site; the banner there asks them to make their account on Baum.
// A personal invitation (?inv=<token>, from slugs.run/i/…) also greets them by name and
// is kept for their welcome tour and the Deploy page (lib/invitation.ts).
export default function InviteLink({ code }: { code: string }) {
  const { user, ready, acceptInvite } = useAuthSession()
  const navigate = useNavigate()
  const token = useSearchParams()[0].get('inv')
  const [state, setState] = useState<'checking' | 'in' | string>('checking')
  const [invitation, setInvitation] = useState<Invitation | null | undefined>(token ? undefined : null)
  useEffect(() => {
    if (!token) return
    openInvitation(token).then(setInvitation)
  }, [token])
  useEffect(() => {
    if (!ready || user) return
    track('invite_view', { ref: code.toUpperCase() })
    let active = true
    acceptInvite(code)
      .then(() => { if (active) setState('in') })
      .catch((err) => { if (active) setState(inviteMessage(err)) })
    return () => { active = false }
  }, [code, ready, user, acceptInvite])

  // A personal invitation waits on its welcome; anything else goes straight in.
  const personal = Boolean(token && invitation)
  if (!personal && invitation !== undefined && (user || state === 'in')) return <Navigate to="/home" replace />
  const failed = state !== 'checking' && state !== 'in'
  if (personal && invitation) return (
    <AuthLayout>
      <img className="invite-card" src={cardUrl(token!)} alt={`${invitation.to}, you’re invited to SLUGS`} width="1200" height="630" />
      <h1>Hey {invitation.to}</h1>
      <p className="invite-sub"><strong>{invitation.from}</strong> invited you to SLUGS.{invitation.note ? <> “{invitation.note}”</> : null}</p>
      {invitation.bots.length > 0 && <p className="invite-sub">Bots to try first: {invitation.bots.map((bot, i) => <span key={bot}>{i ? ', ' : ''}<strong>{bot}</strong></span>)}.</p>}
      {failed
        ? <><p className="down invite-error" role="alert">{state}</p><p className="invite-sub"><Link to="/">Enter a code instead</Link></p></>
        : <button type="button" className="invite-continue" disabled={!(user || state === 'in')} onClick={() => navigate('/home?welcome', { replace: true })}>{user || state === 'in' ? 'Come in' : 'Opening your invite…'}</button>}
    </AuthLayout>
  )
  return (
    <AuthLayout>
      <h1>{!failed ? 'Opening your invite…' : 'That invite didn’t work'}</h1>
      {!failed
        ? <p className="invite-sub" role="status">Checking <strong>{code.toUpperCase()}</strong> with Baum.</p>
        : <><p className="down invite-error" role="alert">{state}</p><p className="invite-sub"><Link to="/">Enter a code instead</Link></p></>}
    </AuthLayout>
  )
}
