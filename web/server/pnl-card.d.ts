export type PnlStyle = 'classic' | 'spotlight' | 'hero'
export type PnlSnapshot = {
  name: string
  pnlUsd: number
  volumeUsd: number
  trades: number
  range: '24h' | '7d' | 'all'
  ref: string
  updatedAt: number
}
export const STYLES: readonly PnlStyle[]
export function escapeXml(value: unknown): string
export function renderPnlCard(card: PnlSnapshot, style: PnlStyle, assets?: { logo?: string; avatar?: string; prefix?: string }): string
