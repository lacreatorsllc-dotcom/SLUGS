import { useCallback, useEffect, useState } from 'react'

// Follows and display names (api/social.js), and a wallet's tokens (api/tokens.js).
const api = (path: string) => `${import.meta.env.BASE_URL}api/${path}`

export type Social = { followers: number; following: number; displayName: string | null; youFollow: boolean; you: string | null }
export type Person = { wallet: string; username: string | null; avatarUrl: string | null; displayName: string | null }
/** 'off' until SLUGS' store is connected: follows and display names stay hidden. */
export type SocialState = Social | 'loading' | 'off' | 'error'

async function call<T>(path: string, body?: Record<string, unknown>): Promise<{ status: number; json: T & { reason?: string } }> {
  const res = await fetch(api(path), {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
  }).catch(() => null)
  return { status: res?.status ?? 0, json: res ? await res.json().catch(() => ({})) : {} }
}

/** A reason Baum or the store gave, when it's a sentence; else a general one. */
export const reasonText = (reason: unknown, fallback = 'That didn’t save. Try again.') => (typeof reason === 'string' && reason.includes(' ') ? reason : fallback)

export function useSocial(wallet: string | undefined) {
  const [state, setState] = useState<SocialState>('loading')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!wallet) return setState('off')
    const { status, json } = await call<Social>(`social?wallet=${wallet.toLowerCase()}`)
    setState(status === 200 ? json : status === 503 ? 'off' : 'error')
  }, [wallet])
  useEffect(() => { setState('loading'); load() }, [load])
  async function setFollowing(follow: boolean) {
    if (!wallet || typeof state !== 'object') return
    setError('')
    // Show it right away; put it back if it doesn't save.
    const before = state
    setState({ ...state, youFollow: follow, followers: state.followers + (follow ? 1 : -1) })
    const { status, json } = await call<Social>('social', { action: follow ? 'follow' : 'unfollow', wallet })
    if (status === 200) setState(json)
    else { setState(before); setError(status === 401 ? 'Sign in with Baum to follow.' : reasonText(json.reason, 'Couldn’t update that. Try again.')) }
  }
  return { state, error, reload: load, follow: () => setFollowing(true), unfollow: () => setFollowing(false) }
}

export async function loadPeople(wallet: string, list: 'followers' | 'following'): Promise<Person[] | null> {
  const { status, json } = await call<{ people: Person[] }>(`social?wallet=${wallet.toLowerCase()}&list=${list}`)
  return status === 200 && Array.isArray(json.people) ? json.people : null
}

/** Follows or unfollows someone from a list; answers an error to show, or null. */
export async function setFollow(wallet: string, follow: boolean): Promise<string | null> {
  const { status, json } = await call('social', { action: follow ? 'follow' : 'unfollow', wallet })
  return status === 200 ? null : status === 401 ? 'Sign in with Baum to follow.' : reasonText(json.reason, 'Couldn’t update that. Try again.')
}

export async function saveDisplayName(name: string): Promise<{ error: string } | { displayName: string | null }> {
  const { status, json } = await call<{ displayName: string | null }>('social', { action: 'display-name', name })
  return status === 200 ? { displayName: json.displayName } : { error: status === 503 ? 'Display names aren’t on yet. Try again soon.' : reasonText(json.reason) }
}

export type TokenHit = { address: string; symbol: string; name: string; priceUsd?: number | null; marketCapUsd?: number | null }
export type TokenAnswer = { tokens: TokenHit[]; pending: boolean } | null

export async function walletTokens(wallet: string, kind: 'launched' | 'traded'): Promise<TokenAnswer> {
  const res = await fetch(api(`tokens?wallet=${wallet.toLowerCase()}&kind=${kind}`)).catch(() => null)
  const json = res?.ok ? await res.json().catch(() => null) : null
  return json && Array.isArray(json.tokens) ? { tokens: json.tokens, pending: Boolean(json.pending) } : null
}
