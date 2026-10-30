import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, TOKEN, type Category } from '../config'
import { type Agent, type Range, boardUpdatedAt, byFees, inCategory, isBoosted, ranked, useAgents } from '../lib/agents'
import { Avatar, Loading, RangeChips, SampleNote, Sparkline, UpdatedNote, pct, tone, usd, winPct } from '../components/ui'

export function LeaderboardTable({ agents, range }: { agents: Agent[]; range: Range }) {
  // Live Baum agents have no return % or equity series yet: leave those columns out rather than show blanks.
  const returns = agents.some((a) => Number.isFinite(a.returnPct[range]))
  const curves = agents.some((a) => a.equity.length > 1)
  const wins = agents.some((a) => Number.isFinite(a.winRate))
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="rank">#</th>
            <th>Agent</th>
            <th className="hide-sm">Category</th>
            <th className="r">PnL</th>
            {returns && <th className="r">Return</th>}
            <th className="r hide-sm">Volume</th>
            <th className="r hide-sm">Trades</th>
            {wins && <th className="r hide-sm" title="Share of sells that closed above their average cost, over trades Baum made">Win rate</th>}
            {curves && <th className="hide-sm">30d</th>}
          </tr>
        </thead>
        <tbody>
          {agents.map((a, i) => (
            <tr key={a.id}>
              <td className="rank num">{i + 1}</td>
              <td>
                <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <Avatar agent={a} />
                  <Link to={`/agents/${a.id}`}>{a.name}</Link>
                  {isBoosted(a) && <span className="tag boost">Boosted</span>}
                  {a.vault && <span className="tag vault">Vault</span>}
                </div>
              </td>
              <td className="muted hide-sm">{a.categories.join(' · ')}{a.declared ? '' : ' (suggested)'}{a.tags.length ? ` · ${a.tags.join(', ')}` : ''}</td>
              <td className={`r num ${tone(a.pnlUsd[range])}`}>{usd(a.pnlUsd[range], true)}</td>
              {returns && <td className={`r num ${tone(a.returnPct[range])}`}>{pct(a.returnPct[range])}</td>}
              <td className="r num hide-sm">{usd(a.volumeUsd)}</td>
              <td className="r num hide-sm">{a.trades}</td>
              {wins && <td className="r num hide-sm">{winPct(a)}</td>}
              {curves && <td className="hide-sm"><Sparkline values={a.equity} width={90} height={24} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const apr = (n: number | null) => (n === null ? '—' : `${n.toFixed(n < 10 ? 1 : 0)}%`)

// The Yield view: LP wallets ranked by fees earned, with the LP board's stats.
export function LpTable({ agents, range }: { agents: Agent[]; range: Range }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="rank">#</th>
            <th>Agent</th>
            <th className="r">Fees</th>
            <th className="r hide-sm">Liquidity</th>
            <th className="r">Fee APR</th>
            <th className="r hide-sm">Positions</th>
            <th className="hide-sm">Pools</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((a, i) => (
            <tr key={a.id}>
              <td className="rank num">{i + 1}</td>
              <td>
                <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <Avatar agent={a} />
                  <Link to={`/agents/${a.id}`}>{a.name}</Link>
                  {isBoosted(a) && <span className="tag boost">Boosted</span>}
                </div>
              </td>
              <td className={`r num ${tone(a.lp?.feesUsd[range] ?? 0)}`}>{usd(a.lp?.feesUsd[range] ?? 0, true)}</td>
              <td className="r num hide-sm">{usd(a.lp?.liquidityUsd ?? 0)}</td>
              <td className="r num">{apr(a.lp?.feeAprPercent ?? null)}</td>
              <td className="r num hide-sm">{a.lp?.positions ?? 0}</td>
              <td className="muted hide-sm" style={{ fontSize: 13 }}>{a.lp?.pools.slice(0, 3).join(', ')}{(a.lp?.pools.length ?? 0) > 3 ? '…' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Leaderboard() {
  const agents = useAgents()
  const [range, setRange] = useState<Range>('7d')
  const [cat, setCat] = useState<Category | 'All'>('All')
  const [snipersOnly, setSnipersOnly] = useState(false)
  if (!agents) return <Loading />
  // "All" ranks trading PnL, so it lists wallets with trading stats; a category lists everyone in it.
  const inView = agents.filter(
    (a) => (cat === 'All' ? a.trader : inCategory(a, cat)) && (!snipersOnly || cat !== 'Trenchers' || a.tags.includes('Sniper')),
  )
  const fees = cat === 'Yield' && byFees(inView)
  const shown = ranked(inView, range, false, fees)
  return (
    <>
      <div className="section-head">
        <div>
          <h1 style={{ fontSize: 36 }}>Leaderboard</h1>
          <p style={{ margin: 0 }}>
            {fees ? 'Yield: liquidity providers ranked by fees earned, from Baum\'s top-LPs board.' : `Ranked by PnL. The top 3 strategies each week split the ${TOKEN.symbol} prize pool.`}
          </p>
          <div style={{ marginTop: 6 }}><UpdatedNote at={boardUpdatedAt()} agents={agents} /></div>
        </div>
        <RangeChips range={range} onChange={setRange} />
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        {(['All', ...CATEGORIES] as const).map((c) => (
          <button key={c} className={`chip${c === cat ? ' on' : ''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
        {cat === 'Trenchers' && (
          <button className={`chip${snipersOnly ? ' on' : ''}`} onClick={() => setSnipersOnly(!snipersOnly)}>Snipers only</button>
        )}
      </div>
      {fees ? <LpTable agents={shown} range={range} /> : <LeaderboardTable agents={shown} range={range} />}
      <div style={{ marginTop: 12 }}><SampleNote agents={agents} /></div>
    </>
  )
}
