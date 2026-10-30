import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BEHAVIOR, STRATEGY_CATEGORY, TOKEN } from '../config'
import type { TokenStats } from './token'
import { RANGES, assembleAgents, lpBoard, traderBoard, type BoardSet, type LpRow, type TraderRow } from './terminal-model'

import { TerminalDataContext as Context, type Snapshot } from './terminal-context'

async function json(file: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${file}.json`, { signal })
  if (!response.ok) throw new Error(`Data unavailable: ${file}`)
  return response.json()
}

function tokenStats(body: unknown): TokenStats | null {
  if (!body || typeof body !== 'object') return null
  const token = body as TokenStats
  if (typeof token.address !== 'string' || token.address.toLowerCase() !== TOKEN.address.toLowerCase()) return null
  if (![token.totalSupply, token.burned, token.updatedAt].every(Number.isFinite)
    || !token.boosts || typeof token.boosts !== 'object' || !Array.isArray(token.recentBoosts)) return null
  if (token.totalSupply < 0 || token.burned < 0 || token.updatedAt <= 0) return null
  if (token.priceUsd !== null && (!Number.isFinite(token.priceUsd) || token.priceUsd < 0)) return null
  if (token.marketCapUsd !== null && (!Number.isFinite(token.marketCapUsd) || token.marketCapUsd < 0)) return null
  if (!Object.values(token.boosts).every((until) => typeof until === 'number' && Number.isFinite(until))) return null
  if (!token.recentBoosts.every((boost) => boost && typeof boost.tx === 'string' && typeof boost.agent === 'string'
    && Number.isFinite(boost.amount) && boost.amount >= 0 && Number.isFinite(boost.at))) return null
  return token
}

async function loadSnapshot(signal: AbortSignal): Promise<Snapshot> {
  const [trading, liquidity, tokenResult] = await Promise.all([
    Promise.allSettled(RANGES.map(async (range) => traderBoard(await json(`leaderboard-${range}`, signal)))),
    Promise.allSettled(RANGES.map(async (range) => lpBoard(await json(`lps-${range}`, signal)))),
    json('token', signal).then(tokenStats).catch(() => null),
  ])
  const traders: BoardSet<TraderRow> = {}, lps: BoardSet<LpRow> = {}
  RANGES.forEach((range, index) => {
    const trader = trading[index], lp = liquidity[index]
    if (trader.status === 'fulfilled') traders[range] = trader.value
    if (lp.status === 'fulfilled') lps[range] = lp.value
  })
  const agents = assembleAgents(traders, lps, (row) => {
    const behavior = BEHAVIOR[row.category ?? ''] ?? { tag: null, suggests: 'Custom' as const }
    const declared = row.strategy ? STRATEGY_CATEGORY[row.strategy] : undefined
    return { category: declared ?? behavior.suggests, declared: Boolean(declared), tags: behavior.tag ? [behavior.tag] : [] }
  }, tokenResult?.boosts)
  return {
    agents, traders, lps, token: tokenResult,
    boardError: trading.every((result) => result.status === 'rejected'),
    partial: [...trading, ...liquidity].some((result) => result.status === 'rejected'),
  }
}

export function TerminalDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setLoading(true)
    setError(false)
    // Never leave a stalled upstream feed in a permanent loading state.
    const timeout = window.setTimeout(() => controller.abort(), 20_000)
    loadSnapshot(controller.signal).then((next) => {
      if (!active) return
      if (controller.signal.aborted && !next.token && next.boardError) throw new Error('Request timed out')
      setSnapshot(next)
    }).catch(() => { if (active) setError(true) }).finally(() => {
      window.clearTimeout(timeout)
      if (active) setLoading(false)
    })
    return () => { active = false; controller.abort(); window.clearTimeout(timeout) }
  }, [revision])
  return <Context.Provider value={{ snapshot, loading, error, refresh }}>{children}</Context.Provider>
}
