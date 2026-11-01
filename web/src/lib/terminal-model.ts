import type { Category } from '../config'
import { plainText } from './untrusted.ts'

export type Range = '24h' | '7d' | 'all'
export const RANGES: Range[] = ['24h', '7d', 'all']
export const rangeLabel = (range: Range) => range === 'all' ? 'All time' : range.toUpperCase()
export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

export type TraderRow = {
  wallet: string
  username?: string
  category?: string
  strategy?: string
  pnlUsd: number
  volumeUsd: number
  trades: number
  tokens: number
  winRate?: number | null
  winTrades?: number
  /** The profile picture set on Baum (/avatar in Telegram, or /account), served by Baum. */
  avatarUrl?: string
  /** An AI agent's permanent slug, like frank-oak: its creator's username and its name at launch. People have none. */
  slug?: string
  /** The AI agent's name, when this wallet is one launched in Baum. */
  agentName?: string
}
export type LpRow = {
  wallet: string
  username?: string
  feesUsd: number
  liquidityUsd: number
  feeAprPercent: number | null
  positions: number
  pools: string[]
  avatarUrl?: string
}
export type Board<T> = { rows: T[]; updatedAt: number | null }
export type Agent = {
  id: string
  name: string
  categories: Category[]
  declared: boolean
  tags: string[]
  trading: Partial<Record<Range, TraderRow>>
  liquidity: Partial<Record<Range, LpRow>>
  boostedUntil?: number
  avatarUrl?: string
  /** Set for AI agents only; never changes, even when the username does. */
  slug?: string
}
export type BoardSet<T> = Partial<Record<Range, Board<T>>>

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const wallet = (value: unknown): value is string => typeof value === 'string' && /^0x[0-9a-f]{40}$/i.test(value)
// A picture that isn't a plain https URL is left out, not a reason to drop the board.
const avatar = (value: unknown): value is string => typeof value === 'string' && /^https:\/\/[^\s"']+$/.test(value)
export const isSlug = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(value)
/** An agent's page: by its slug when it's an AI agent, else by wallet. */
export const agentPath = (agent: { id: string; slug?: string }) => `/agents/${agent.slug ?? agent.id}`

// Fields on a board row that people write themselves: shown as plain text (lib/untrusted.ts).
const WRITTEN = { username: 40, agentName: 48, strategy: 48, category: 32 } as const

function board<T>(body: unknown, valid: (row: unknown) => boolean): Board<T> {
  if (!record(body) || !Array.isArray(body.rows) || !body.rows.every(valid)) throw new Error('Invalid Baum board')
  const rows = (body.rows as Record<string, unknown>[]).map((row) => {
    const clean = { ...row }
    for (const [field, max] of Object.entries(WRITTEN)) if (typeof row[field] === 'string') clean[field] = plainText(row[field], max) || undefined
    if (Array.isArray(row.pools)) clean.pools = row.pools.map((pool) => plainText(pool, 48))
    return clean
  })
  return { rows: rows as T[], updatedAt: finite(body.updatedAt) && body.updatedAt > 0 ? body.updatedAt : null }
}

export function traderBoard(body: unknown): Board<TraderRow> {
  return board(body, (row) => record(row) && wallet(row.wallet)
    && finite(row.pnlUsd) && finite(row.volumeUsd) && row.volumeUsd >= 0
    && Number.isInteger(row.trades) && (row.trades as number) >= 0
    && Number.isInteger(row.tokens) && (row.tokens as number) >= 0
    && (row.username === undefined || typeof row.username === 'string')
    && (row.category === undefined || typeof row.category === 'string')
    && (row.strategy === undefined || typeof row.strategy === 'string')
    && (row.winRate === undefined || row.winRate === null || (finite(row.winRate) && row.winRate >= 0 && row.winRate <= 1)))
}

export function lpBoard(body: unknown): Board<LpRow> {
  return board(body, (row) => record(row) && wallet(row.wallet)
    && finite(row.feesUsd) && finite(row.liquidityUsd) && row.liquidityUsd >= 0
    && (row.feeAprPercent === null || finite(row.feeAprPercent))
    && Number.isInteger(row.positions) && (row.positions as number) >= 0
    && Array.isArray(row.pools) && row.pools.every((pool) => typeof pool === 'string')
    && (row.username === undefined || typeof row.username === 'string'))
}

export function assembleAgents(
  traders: BoardSet<TraderRow>,
  lps: BoardSet<LpRow>,
  classify: (row: TraderRow) => { category: Category; declared: boolean; tags: string[] },
  boosts: Record<string, number> = {},
): Agent[] {
  const agents = new Map<string, Agent>()
  const get = (row: { wallet: string; username?: string; avatarUrl?: string; slug?: string }) => {
    const id = row.wallet.toLowerCase()
    let agent = agents.get(id)
    if (!agent) {
      agent = { id, name: shortAddress(id), categories: [], declared: false, tags: [], trading: {}, liquidity: {}, boostedUntil: boosts[id] }
      agents.set(id, agent)
    }
    if (row.username) agent.name = `@${row.username.replace(/^@/, '')}`
    if (avatar(row.avatarUrl)) agent.avatarUrl = row.avatarUrl
    if (isSlug(row.slug)) agent.slug = row.slug
    return agent
  }
  // The all-time classification is the stable category; range-specific stats stay together.
  for (const range of ['all', '7d', '24h'] as Range[]) {
    for (const row of traders[range]?.rows ?? []) {
      const agent = get(row)
      agent.trading[range] = row
      if (!agent.categories.length) {
        const classification = classify(row)
        agent.categories = [classification.category]
        agent.declared = classification.declared
        agent.tags = classification.tags
      }
    }
  }
  for (const range of RANGES) {
    for (const row of lps[range]?.rows ?? []) {
      const agent = get(row)
      agent.liquidity[range] = row
      if (!agent.categories.includes('Yield')) agent.categories.push('Yield')
    }
  }
  return [...agents.values()]
}

/**
 * An AI agent Baum knows that isn't on the boards yet, from api/agent.js: one just
 * launched or funded that hasn't traded. Null for anything else.
 */
export function launchedAgent(body: unknown, categoryOf: (strategy: string) => Category | undefined): Agent | null {
  const name = record(body) ? plainText(body.name, 48) : ''
  if (!record(body) || !wallet(body.wallet) || !name) return null
  const strategy = record(body.strategy) && typeof body.strategy.id === 'string' ? categoryOf(body.strategy.id) : undefined
  return {
    id: body.wallet.toLowerCase(),
    name,
    categories: strategy ? [strategy] : [],
    declared: Boolean(strategy),
    tags: [],
    trading: {},
    liquidity: {},
    ...(isSlug(body.slug) ? { slug: body.slug } : {}),
    ...(avatar(body.avatarUrl) ? { avatarUrl: body.avatarUrl } : {}),
  }
}

/** Who launched an AI agent, from Baum's answer for it (api/agent.js?id=): their wallet and username, or null. */
export function creatorOf(body: unknown): { wallet: string; username: string | null } | null {
  if (!record(body) || !record(body.creator) || !wallet(body.creator.wallet)) return null
  const username = plainText(body.creator.username, 48)
  return { wallet: body.creator.wallet.toLowerCase(), username: username || null }
}

/** Baum's AI agents matching a search (api/agent.js?q=), as agents; anything malformed is left out. */
export function foundAgents(body: unknown, categoryOf: (strategy: string) => Category | undefined): Agent[] {
  if (!record(body) || !Array.isArray(body.agents)) return []
  return body.agents.map((row) => launchedAgent(row, categoryOf)).filter((agent): agent is Agent => agent !== null)
}

/** Whether an agent matches a search: people by @username, AI agents by name or slug, anyone by wallet. */
export function matchesSearch(agent: Agent, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^@/, '')
  return !q || `${agent.name} ${agent.slug ?? ''} ${agent.id} ${agent.tags.join(' ')}`.toLowerCase().includes(q)
}

export const isBoosted = (agent: Agent) => (agent.boostedUntil ?? 0) > Date.now()

export function comparisonIds(requested: string[], available: Agent[]) {
  const known = new Set(available.map((agent) => agent.id))
  return [...new Set(requested.map((id) => id.toLowerCase()))].filter((id) => known.has(id)).slice(0, 4)
}

export function sortedAgents(agents: Agent[], range: Range, sort = 'pnl', yieldOnly = false) {
  const score = (agent: Agent) => {
    if (yieldOnly) {
      const row = agent.liquidity[range]
      if (sort === 'volume') return row?.liquidityUsd ?? -Infinity
      if (sort === 'trades') return row?.positions ?? -Infinity
      if (sort === 'wins') return row?.feeAprPercent ?? -Infinity
      return row?.feesUsd ?? -Infinity
    }
    const row = agent.trading[range]
    if (sort === 'volume') return row?.volumeUsd ?? -Infinity
    if (sort === 'trades') return row?.trades ?? -Infinity
    if (sort === 'wins') return row?.winRate ?? -Infinity
    return row?.pnlUsd ?? -Infinity
  }
  return [...agents].sort((a, b) => {
    const left = score(a), right = score(b)
    return left === right ? a.id.localeCompare(b.id) : right > left ? 1 : -1
  })
}
