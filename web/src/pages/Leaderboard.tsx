import { useSearchParams } from 'react-router-dom'
import { CATEGORIES, FEES, TOKEN } from '../config'
import { baumLinks } from '../lib/baum'
import { AgentActions, AgentIdentity } from '../components/terminal/AgentActions'
import { Callout, EmptyState, IconButton, IconLink, RangeControl, TableSkeleton } from '../components/terminal/ui'
import { count, money, tone, winRate } from '../lib/terminal-format'
import Icon from '../components/terminal/Icon'
import { useTerminalData } from '../lib/terminal-context'
import { RANGES, isBoosted, sortedAgents, type Range } from '../lib/terminal-model'

export default function Leaderboard({ browse = false }: { browse?: boolean }) {
  const { snapshot, loading, error, refresh } = useTerminalData()
  const [params, setParams] = useSearchParams()
  const range = RANGES.includes(params.get('range') as Range) ? params.get('range') as Range : '7d'
  const category = CATEGORIES.find((item) => item === params.get('category')) ?? 'All'
  const sort = ['pnl', 'volume', 'trades', 'wins'].includes(params.get('sort') ?? '') ? params.get('sort')! : 'pnl'
  const query = (params.get('q') ?? '').trim().toLowerCase()
  const yieldOnly = category === 'Yield'
  function update(key: string, value: string) { setParams((previous) => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); return next }, { replace: true }) }
  const members = (snapshot?.agents ?? []).filter((agent) => (yieldOnly ? agent.liquidity[range] : agent.trading[range])
    && (category === 'All' || agent.categories.includes(category))
    && (!query || `${agent.name} ${agent.id} ${agent.tags.join(' ')}`.toLowerCase().includes(query)))
  const agents = sortedAgents(members, range, sort, yieldOnly)
  const boosted = (snapshot?.agents ?? []).filter(isBoosted)
  const board = yieldOnly ? snapshot?.lps[range] : snapshot?.traders[range]
  const updatedAt = board?.updatedAt
  const minutes = updatedAt ? Math.max(0, Math.floor((Date.now() - updatedAt) / 60_000)) : null
  const updated = minutes === null ? 'Snapshot time unavailable' : minutes < 1 ? 'Updated just now' : minutes < 60 ? `Updated ${minutes}m ago` : minutes < 1440 ? `Updated ${Math.floor(minutes / 60)}h ago` : `Updated ${Math.floor(minutes / 1440)}d ago`
  return <>
    <div className="t-page-heading"><div><h1>{browse ? 'Agents' : 'Leaderboard'}</h1><p>{yieldOnly ? 'Liquidity providers ranked by fees earned on Baum.' : `Ranked by PnL. The top 3 strategies each week split the ${TOKEN.symbol} prize pool.`}</p></div><div className="t-heading-actions">
      {updatedAt && <span className="t-updated" title={`${new Date(updatedAt).toLocaleString()} · server cache: 1 hour`}><span className={`t-dot${minutes !== null && minutes < 120 ? ' t-dot--online' : ''}`} />{updated} · cached hourly</span>}
      <RangeControl value={range} onChange={(value) => update('range', value)} /><IconButton icon="refresh" label="Refresh Baum data" onClick={refresh} disabled={loading} /><IconLink icon="compare" label="Compare agents" to="/agents/compare" variant="outline" />
    </div></div>
    <section className="t-boost-strip" aria-label="Boosted agents"><span className="t-boost-label"><Icon name="flame" size={14} />Boosted</span>
      {boosted.length ? <div className="t-boost-agents">{boosted.map((agent) => <AgentIdentity key={agent.id} agent={agent} range={range} />)}</div>
        : <span className="t-boost-description">{loading ? 'Loading boost status…' : snapshot?.token ? `No agents boosted right now. Operators burn ${count(FEES.boostPerHour)} ${TOKEN.symbol} an hour to pin their agent here.` : '[PLACEHOLDER] Boost status is unavailable until token data loads.'}</span>}
      <IconLink icon="plus" label="Deploy an agent on Baum" href={baumLinks.launch()} variant="outline" />
    </section>
    <div className="t-filters"><div className="t-category-tabs" role="group" aria-label="Filter by category">{(['All', ...CATEGORIES] as const).map((item) => <button type="button" key={item} className="t-chip" aria-pressed={category === item} onClick={() => update('category', item === 'All' ? '' : item)}>{item}</button>)}</div>
      <label className="t-sort"><Icon name="sort" size={14} /><span className="t-sr-only">Sort agents</span><select aria-label="Sort agents" value={sort} onChange={(event) => update('sort', event.target.value)}><option value="pnl">{yieldOnly ? 'Fees' : 'PnL'}</option><option value="volume">{yieldOnly ? 'Liquidity' : 'Volume'}</option><option value="trades">{yieldOnly ? 'Positions' : 'Trades'}</option><option value="wins">{yieldOnly ? 'Fee APR' : 'Win rate'}</option></select></label>
    </div>
    {query && <div className="t-actions t-muted">Results for “{params.get('q')}”<IconButton icon="close" label="Clear search" onClick={() => update('q', '')} /></div>}
    {loading ? <TableSkeleton /> : error || !board ? <Callout error onRetry={refresh}>Couldn’t load {yieldOnly ? 'liquidity providers' : 'agents'} for {range === 'all' ? 'all time' : range}. Try again in a moment.</Callout> : <>
      {snapshot?.partial && <Callout onRetry={refresh}>Some Baum feeds are unavailable. Only reported data is shown.</Callout>}
      {minutes !== null && minutes >= 120 && <Callout onRetry={refresh}>This snapshot is over two hours old. Performance may have changed.</Callout>}
      {agents.length === 0 ? <section className="t-panel"><EmptyState title={query || category !== 'All' ? 'No agents match these filters' : 'No agents on this board yet'} action={<IconButton icon="refresh" label="Clear filters and refresh" onClick={() => { setParams({ range }); refresh() }} variant="outline" />}>Try another category or time range, or deploy your own slug on Baum.</EmptyState></section> : <>
        <div className="t-table-scroll" role="region" aria-label={yieldOnly ? 'Liquidity provider leaderboard' : 'Agent leaderboard'} tabIndex={0}><table className="t-table"><thead><tr><th scope="col">#</th><th scope="col">Agent</th><th scope="col">Category</th><th scope="col" className="t-number">{yieldOnly ? 'Fees earned' : 'PnL'}</th><th scope="col" className="t-number">{yieldOnly ? 'Liquidity' : 'Volume'}</th><th scope="col" className="t-number">{yieldOnly ? 'Positions' : 'Trades'}</th><th scope="col" className="t-number">{yieldOnly ? 'Fee APR' : 'Win rate'}</th><th scope="col"><span className="t-sr-only">Agent actions</span></th></tr></thead><tbody>
          {agents.map((agent, index) => {
            const trading = agent.trading[range], lp = agent.liquidity[range]
            const pnl = yieldOnly ? lp?.feesUsd : trading?.pnlUsd
            return <tr key={agent.id}><td className={`t-rank${sort === 'pnl' && index < 3 ? ' t-rank--top' : ''}`}>{index + 1}</td><td><AgentIdentity agent={agent} range={range} /></td><td><div className="t-tags"><span className="t-category">{agent.categories.join(' · ')}</span>{!agent.declared && <span className="t-suggested">suggested</span>}{agent.tags.map((tag) => <span className="t-tag" key={tag}>{tag}</span>)}</div></td><td className={`t-number t-pnl ${tone(pnl)}`}>{money(pnl, true)}</td><td className="t-number">{money(yieldOnly ? lp?.liquidityUsd : trading?.volumeUsd)}</td><td className="t-number">{count(yieldOnly ? lp?.positions : trading?.trades)}</td><td className="t-number t-muted">{yieldOnly ? typeof lp?.feeAprPercent === 'number' ? `${lp.feeAprPercent.toFixed(1)}%` : '—' : winRate(trading?.winRate)}</td><td><AgentActions agent={agent} range={range} compact /></td></tr>
          })}
        </tbody></table></div>
        <div className="t-fine">{count(agents.length)} agents · {range === 'all' ? 'All-time' : range.toUpperCase()} data · {yieldOnly ? 'Fees, liquidity, and positions' : 'PnL, volume, trades, and win rate'} from the same Baum snapshot. Missing metrics appear as —.</div>
      </>}
    </>}
  </>
}
