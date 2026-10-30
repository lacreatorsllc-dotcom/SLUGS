import { useEffect, useState } from 'react'
import { FEES, TOKEN } from '../config'

// What the Pages job read off the chain about the platform token (scripts/fetch-token.mjs).
export type TokenStats = {
  address: string
  priceUsd: number | null
  marketCapUsd: number | null
  totalSupply: number
  burned: number // everything sent to the dead address
  boostBurned: number // the part of that spent on boosts
  boosts: Record<string, number> // agent wallet (lowercase) -> boosted until, ms
  recentBoosts: { tx: string; agent: string; from: string; amount: number; at: number }[]
  updatedAt: number
}

let cache: Promise<TokenStats | null> | undefined

export function loadToken(): Promise<TokenStats | null> {
  if (!TOKEN.address) return Promise.resolve(null)
  cache ??= fetch(`${import.meta.env.BASE_URL}data/token.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((t: TokenStats | null) => (t?.address === TOKEN.address.toLowerCase() ? t : null))
    .catch(() => null)
  return cache
}

export function useToken() {
  const [token, setToken] = useState<TokenStats | null | undefined>(undefined)
  useEffect(() => {
    loadToken().then(setToken)
  }, [])
  return token
}

/** Opening a vault costs 1M tokens or $100 of them, whichever is fewer tokens. */
export function vaultOpenTokens(priceUsd: number | null | undefined) {
  if (!priceUsd) return FEES.vaultOpenTokens
  return Math.min(FEES.vaultOpenTokens, Math.ceil(FEES.vaultOpenUsd / priceUsd))
}
