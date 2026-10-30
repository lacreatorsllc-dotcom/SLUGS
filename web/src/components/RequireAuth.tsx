import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthSession } from '../lib/auth-context'
import AuthLayout from './AuthLayout'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready, error, retry } = useAuthSession()
  if (!ready) return <AuthLayout><p className="invite-sub" role="status">Restoring your session…</p></AuthLayout>
  if (error) return <AuthLayout><h1>Couldn’t restore your session</h1><p className="invite-sub" role="alert">Check your connection and try again.</p><button type="button" className="invite-continue" onClick={retry}>Try again</button></AuthLayout>
  if (!user) return <Navigate to="/login" replace />
  return children
}
