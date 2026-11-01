import type { PnlSnapshot } from '../../server/pnl-card.js'
import type { BaumProfile } from './auth-context'
import type { Agent, Range } from './terminal-model'

export type PnlPreview = PnlSnapshot & { wallet: string; avatarUrl: string | null }

export function avatarForCard(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return url.origin === 'https://baumai.xyz' && /^\/api\/avatar\/0x[0-9a-f]{40}$/i.test(url.pathname) ? url.href : undefined
  } catch { return undefined }
}

/** Paint from the same reported row already on screen; signing/export runs separately. */
export function pnlPreview(agent: Agent, range: Range, updatedAt: number | null | undefined, user: BaumProfile | null): PnlPreview | null {
  const row = agent.trading[range]
  if (!row) return null
  const own = user?.wallets.some((wallet) => wallet.toLowerCase() === agent.id.toLowerCase())
  const invite = user?.invites?.[0]
  const ref = invite?.aliases?.[0] || invite?.code || 'SLUGS'
  return {
    wallet: agent.id, range, name: own && user?.username ? `@${user.username.replace(/^@/, '')}` : agent.name,
    pnlUsd: row.pnlUsd, volumeUsd: row.volumeUsd, trades: row.trades,
    avatarUrl: avatarForCard(own ? user?.avatarUrl ?? agent.avatarUrl : agent.avatarUrl) ?? null,
    ref: /^[A-Za-z0-9_-]{1,40}$/.test(ref) ? ref : 'SLUGS',
    updatedAt: updatedAt ?? Date.now(),
  }
}
