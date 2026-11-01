import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Callout } from '../components/terminal/ui'
import { visitorId } from '../lib/funnel'
import { count, tone, winRate } from '../lib/terminal-format'
import { equityPath, inUnit, isStrategyId, pct, unavailableText, unitsOf, type PaperLinks, type PaperStrategy as Strategy } from '../lib/paper'

const CHART = { width: 600, height: 160 }

// One paper strategy from Baum (api/paper.js). Each visit is paid for by SLUGS through
// Baum, once a visitor an hour, so the page asks once on load and not on a timer.
export default function PaperStrategy() {
  const { id } = useParams()
  const [state, setState] = useState<{ id?: string; strategy: Strategy | null; links: PaperLinks | null; reason: string | null }>({ strategy: null, links: null, reason: null })
  const [unit, setUnit] = useState<string | null>(null)

  useEffect(() => {
    if (!isStrategyId(id)) return
    let live = true
    visitorId() // the cookie api/paper.js counts this visitor by
    fetch(`${import.meta.env.BASE_URL}api/paper?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!live) return
        if (response.ok && body.strategy) setState({ id, strategy: body.strategy, links: body.links ?? null, reason: null })
        else setState({ id, strategy: null, links: null, reason: body.reason ?? 'failed' })
      })
      .catch(() => { if (live) setState({ id, strategy: null, links: null, reason: 'failed' }) })
    return () => { live = false }
  }, [id])

  useEffect(() => { if (state.strategy) document.title = `${state.strategy.name} · Paper trading · SLUGS` }, [state.strategy])

  if (!isStrategyId(id)) return <Callout error>{unavailableText('not-found')} <Link to="/paper">See all paper strategies</Link>.</Callout>
  if (state.id !== id) return <p className="t-muted" role="status">Loading the strategy…</p>
  const s = state.strategy
  if (!s) return <Callout error>{unavailableText(state.reason)} <Link to="/paper">See all paper strategies</Link>.</Callout>

  const units = unitsOf(s)
  const shown = unit && units.includes(unit) ? unit : units[0]
  const path = equityPath(s.equity, CHART.width, CHART.height)
  return <>
    <div className="t-callout" role="note"><strong>PAPER TRADE</strong><div>{s.label}. No real funds were traded.</div></div>
    <div className="t-page-heading"><div><h1>{s.name}</h1><p>{s.by ? `By ${s.by} · ` : ''}Started {new Date(s.startedAt).toLocaleDateString()} · {count(s.daysRunning)} days · {count(s.followers)} copying</p></div>
      <div className="t-heading-actions">
        {state.links && <a className="t-top-button t-top-button--primary" href={state.links.run} target="_blank" rel="noreferrer">Run this strategy</a>}
        {state.links && <a className="t-top-button" href={state.links.own} target="_blank" rel="noreferrer">Make your own</a>}
      </div>
    </div>

    <dl className="t-stats" style={{ '--stat-count': 3 } as React.CSSProperties}>
      {s.headline.map((h) => <div className="t-stat" key={h.key}><dt>{h.label}</dt><dd>{h.value}</dd></div>)}
    </dl>

    <section className="t-panel"><div className="t-panel-head"><div><h2>Worth and P&amp;L</h2><p>Started with {inUnit(s.capitalUsd, 'USD')} of pretend money.</p></div>
      {units.length > 1 && <div className="t-segments" role="group" aria-label="Show in">{units.map((u) => <button type="button" key={u} aria-pressed={u === shown} onClick={() => setUnit(u)}>{u}</button>)}</div>}
    </div>
      <dl className="t-stats" style={{ '--stat-count': 4, border: 0, borderRadius: 0 } as React.CSSProperties}>
        <div className="t-stat"><dt>Worth</dt><dd>{inUnit(s.worth[shown], shown)}</dd></div>
        <div className="t-stat"><dt>P&amp;L</dt><dd className={tone(s.pnl[shown])}>{inUnit(s.pnl[shown], shown, true)}</dd></div>
        <div className="t-stat"><dt>Total return</dt><dd className={tone(s.totalReturnPct)}>{pct(s.totalReturnPct)}</dd></div>
        <div className="t-stat"><dt>Trades</dt><dd>{count(s.trades)}</dd><div className="t-stat-note">Win rate {winRate(s.winRate)}</div></div>
      </dl>
      {path ? <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} preserveAspectRatio="none" role="img" aria-label="Worth over time, in dollars" style={{ width: '100%', height: CHART.height, display: 'block', padding: '8px 16px' }}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className={tone(s.totalReturnPct)} />
      </svg> : <p className="t-fine" style={{ padding: '8px 16px' }}>The chart starts once there are two marks.</p>}
    </section>

    <div className="t-two-column">
      <section className="t-panel"><div className="t-panel-head"><h2>Against just holding</h2></div>
        <table className="t-table" style={{ minWidth: 0 }}><thead><tr><th scope="col">Benchmark</th><th scope="col" className="t-number">Holding it</th><th scope="col" className="t-number">This strategy’s edge</th></tr></thead><tbody>
          {s.vs.map((v) => <tr key={v.key}><td>{v.label}</td><td className="t-number">{pct(v.holdReturnPct)}</td><td className={`t-number t-pnl ${tone(v.edgePct)}`}>{pct(v.edgePct)}</td></tr>)}
        </tbody></table>
      </section>
      <section className="t-panel"><div className="t-panel-head"><h2>Recent trades</h2></div>
        {s.recentTrades.length === 0 ? <p className="t-fine" style={{ padding: 16 }}>No trades yet.</p>
          : <table className="t-table" style={{ minWidth: 0 }}><thead><tr><th scope="col">When</th><th scope="col">Trade</th><th scope="col" className="t-number">Size</th></tr></thead><tbody>
            {s.recentTrades.map((t, i) => <tr key={`${t.at}-${i}`}><td className="t-muted">{new Date(t.at).toLocaleString()}</td><td className={t.side === 'buy' ? 't-positive' : 't-negative'}>{t.side === 'buy' ? 'Buy' : 'Sell'} {t.symbol} <span className="t-muted">· {t.chain}</span></td><td className="t-number">{inUnit(t.usd, 'USD')}</td></tr>)}
          </tbody></table>}
      </section>
    </div>
    <div className="t-fine">PAPER TRADE: every fill uses Baum’s real quote for that size at that moment, less fees and estimated network costs; the trades move no market. Updated {new Date(s.updatedAt).toLocaleString()}. <Link to="/paper">All paper strategies</Link></div>
  </>
}
