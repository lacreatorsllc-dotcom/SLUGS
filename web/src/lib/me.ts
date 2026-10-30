import { useEffect, useState } from 'react'

// Who's signed in, from /api/me (web/api/me.js). Signing in happens in Baum: the
// Sign in button opens Telegram, and Baum's one-time button comes back to
// /api/session, which sets the cookie this reads with.

export type Profile = {
  username: string | null
  wallets: string[]
  strategy: { id: string; name: string } | null
  copy: {
    status: 'draft' | 'active' | 'paused'
    sources: { label: string; ref: string; sizing: string }[]
    perTradeUsd: number
    dailyUsd: number
  } | null
}

let cache: Promise<Profile | null> | null = null

export function loadMe(): Promise<Profile | null> {
  cache ??= fetch('/api/me', { credentials: 'same-origin' })
    .then((r) => (r.ok ? (r.json() as Promise<Profile>) : null))
    .catch(() => null)
  return cache
}

/** undefined while loading, null when signed out. */
export function useMe() {
  const [me, setMe] = useState<Profile | null | undefined>(undefined)
  useEffect(() => {
    loadMe().then(setMe)
  }, [])
  return me
}

export async function signOut() {
  await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => null)
  cache = null
  window.location.assign('/')
}
