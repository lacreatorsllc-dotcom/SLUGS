// Paper trading: strategies run on Baum with pretend money at real prices, shown here
// through Baum's partner API (api/paper.js passes the calls on with SLUGS' key). A
// strategy's owner makes it public from Baum chat; then it has a page here, and its
// "Run this strategy" button starts a paper copy of it on Baum.
// Pure, so it tests without the app.

/** Worth and P&L come in each unit Baum could price; SLUGS' order is ETH, then USD, then BTC. */
export type Unit = string

export type Headline = { key: string; label: string; value: string }

export type Scores = { vsBtcPct: number | null; worstDropPct: number; weeksPositiveShare: number | null }

/** A line on the board: GET api/paper. */
export type PaperSummary = {
  id: string
  name: string
  by: string | null
  label: string
  units: Unit[]
  worth: Record<Unit, number | null>
  totalReturnPct: number
  headline: Headline[]
  scores: Scores
  trades: number
  daysRunning: number
  followers: number
  updatedAt: string
}

/** One strategy's page: GET api/paper?id=. */
export type PaperStrategy = PaperSummary & {
  startedAt: string
  capitalUsd: number
  equityUsd: number
  suggestUnit?: Unit
  pnl: Record<Unit, number | null>
  vs: { key: string; label: string; holdReturnPct: number; edgePct: number }[]
  winRate: number | null
  daysActive: number
  equity: { at: string; usd: number }[]
  recentTrades: { at: string; side: 'buy' | 'sell'; symbol: string; usd: number | null; chain: string; venue: string }[]
}

export type PaperLinks = { run: string; own: string; page: string }

export const isStrategyId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{8}$/.test(v)

/** "+3.21%" or "−3.21%": a real minus, so a column of them lines up. */
export function pct(n: number | null | undefined, signed = true): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  const sign = n < 0 ? '−' : signed && n > 0 ? '+' : ''
  return `${sign}${Math.abs(n).toFixed(2)}%`
}

/** An amount in a unit: dollars as $1,234.56, coins to four significant figures. */
export function inUnit(n: number | null | undefined, unit: Unit, signed = false): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  const sign = n < 0 ? '−' : signed && n > 0 ? '+' : ''
  const a = Math.abs(n)
  if (unit === 'USD') return `${sign}$${a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const shown = a === 0 ? '0' : a >= 1000 ? a.toLocaleString('en-US', { maximumFractionDigits: 2 }) : a.toPrecision(4).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  return `${sign}${shown} ${unit}`
}

/** The units a strategy can be shown in, in the order Baum gave them (SLUGS' first). */
export function unitsOf(s: Pick<PaperSummary, 'units' | 'worth'>): Unit[] {
  const priced = s.units.filter((u) => typeof s.worth[u] === 'number')
  return priced.length ? priced : ['USD']
}

/** The equity line as an SVG path in a `width` × `height` box, oldest on the left. Empty under two points. */
export function equityPath(points: { at: string; usd: number }[], width: number, height: number): string {
  const ok = points.filter((p) => Number.isFinite(p.usd) && Number.isFinite(Date.parse(p.at)))
  if (ok.length < 2) return ''
  const xs = ok.map((p) => Date.parse(p.at))
  const ys = ok.map((p) => p.usd)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  const x = (t: number) => (x1 === x0 ? 0 : ((t - x0) / (x1 - x0)) * width)
  const y = (v: number) => (y1 === y0 ? height / 2 : height - ((v - y0) / (y1 - y0)) * height)
  return ok.map((p, i) => `${i ? 'L' : 'M'}${x(xs[i]).toFixed(1)} ${y(p.usd).toFixed(1)}`).join(' ')
}

/** What a page says when Baum can't show the strategy. */
export function unavailableText(reason: string | null): string {
  if (reason === 'resting') return 'This page is resting for now. The strategy is still running on Baum.'
  if (reason === 'not-found') return 'This paper strategy isn’t public, or doesn’t exist.'
  return 'Couldn’t load this strategy from Baum. Try again in a moment.'
}
