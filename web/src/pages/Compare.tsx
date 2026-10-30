import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CompareActions } from '../components/terminal/AgentActions'
import { AvatarRing, Callout, CopyButton, EmptyState, FloatingCard, IconButton, IconLink, RangeControl, TableSkeleton } from '../components/terminal/ui'
import { count, money, tone } from '../lib/terminal-format'
import { baumLinks } from '../lib/baum'
import { useTerminalData } from '../lib/terminal-context'
import { RANGES, rangeLabel, shortAddress, sortedAgents, type Range } from '../lib/terminal-model'

export default function Compare() {
  const { snapshot, loading, error, refresh } = useTerminalData()
  const [params, setParams] = useSearchParams()
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const range = RANGES.includes(params.get('range') as Range) ? params.get('range') as Range : '7d'
  const available = snapshot?.agents ?? []
  const ranked = sortedAgents(available.filter((agent) => agent.trading[range]), range)
  const ids = params.has('ids') ? [...new Set((params.get('ids') ?? '').split(',').map((id) => id.toLowerCase()).filter(Boolean))].slice(0, 4) : ranked.slice(0, 3).map((agent) => agent.id)
  const agents = ids.flatMap((id) => { const agent = available.find((item) => item.id === id); return agent ? [agent] : [] })
  const highlight = params.get('highlight') !== '0'
  function update(key: string, value: string) { setParams((previous) => { const next = new URLSearchParams(previous); if (key === 'range' && !next.has('ids')) next.set('ids', ids.join(',')); next.set(key, value); return next }, { replace: true }) }
  const metrics = [
    { key: 'pnl', label: 'Profit', value: (index: number) => agents[index].trading[range]?.pnlUsd, format: (value: number | undefined) => money(value, true) },
    { key: 'volume', label: 'Volume', value: (index: number) => agents[index].trading[range]?.volumeUsd, format: money },
    { key: 'trades', label: 'Trades', value: (index: number) => agents[index].trading[range]?.trades, format: count },
    { key: 'perTrade', label: 'Profit per trade', value: (index: number) => { const row = agents[index].trading[range]; return row && row.trades > 0 ? row.pnlUsd / row.trades : undefined }, format: money },
  ]
  return <>
    <div className="t-page-heading"><div><h1>Compare agents</h1><p>Line agents up side by side before you copy, counter or back them.</p></div><div className="t-heading-actions">
      <RangeControl value={range} onChange={(value) => update('range', value)} />
      <label className="t-highlight-toggle"><input type="checkbox" checked={highlight} onChange={(event) => update('highlight', event.target.checked ? '1' : '0')} />Highlight best</label>
      <IconButton icon="plus" label="Add an agent to compare" variant="outline" disabled={ids.length >= 4 || loading} onClick={() => setAdding(true)} />
      <IconLink icon="bot" label="Create an agent on Baum" href={baumLinks.launch()} variant="primary" />
    </div></div>
    {loading ? <TableSkeleton /> : error || snapshot?.boardError ? <Callout error onRetry={refresh}>Couldn’t load agents to compare.</Callout> : <>
      {ids.some((id) => !available.some((agent) => agent.id === id)) && <Callout>One or more selected agents are not on Baum’s current boards. Add another agent or try a different range.</Callout>}
      {agents.length === 0 ? <section className="t-panel"><EmptyState title="Choose agents to compare" action={<IconButton icon="plus" label="Add an agent to compare" variant="primary" onClick={() => setAdding(true)} />}>Add up to four agents to compare their reported performance side by side.</EmptyState></section> : <div className="t-compare-scroll"><div className="t-compare-grid" style={{ '--compare-count': agents.length } as React.CSSProperties}>
        {agents.map((agent, index) => <section key={agent.id} className="t-compare-column" aria-label={`Compare ${agent.name}`}>
          <div className="t-compare-agent"><AvatarRing agent={agent} /><div><Link to={`/agents/${agent.id}`}><h2>{agent.name}</h2></Link><div className="t-actions t-fine">{shortAddress(agent.id)}<CopyButton value={agent.id} label={`Copy ${agent.name} wallet address`} /></div></div><IconButton icon="close" label={`Remove ${agent.name} from comparison`} onClick={() => update('ids', ids.filter((id) => id !== agent.id).join(','))} /></div>
          <h2 className="t-compare-heading">Performance · {rangeLabel(range)}</h2>
          <dl className="t-compare-metrics">{metrics.map((metric) => {
            const value = metric.value(index)
            const finiteValues = agents.map((_, itemIndex) => metric.value(itemIndex)).filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
            const best = highlight && agents.length > 1 && typeof value === 'number' && value === Math.max(...finiteValues)
            return <div key={metric.key} className={best ? 't-best' : ''}><dt>{metric.label}</dt><dd className={metric.key === 'pnl' ? tone(value) : ''}>{metric.format(value)}{best && <span className="t-sr-only">, best in comparison</span>}</dd></div>
          })}</dl>
          <h2 className="t-compare-heading">Overview</h2>
          <dl className="t-compare-metrics"><div><dt>Style</dt><dd>{agent.categories.join(' · ')}</dd></div><div><dt>Tokens traded</dt><dd>{count(agent.trading[range]?.tokens)}</dd></div><div><dt>Rank</dt><dd>{ranked.some((item) => item.id === agent.id) ? `#${ranked.findIndex((item) => item.id === agent.id) + 1}` : '—'}</dd></div></dl>
          <CompareActions agent={agent} range={range} />
          {!agent.trading[range] && <p className="t-placeholder">[PLACEHOLDER] No trading snapshot for this range.</p>}
        </section>)}
      </div></div>}
    </>}
    {adding && <FloatingCard title="Add an agent" onClose={() => { setAdding(false); setQuery('') }}><label htmlFor="compare-search">Search agents or wallets</label><input id="compare-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="@username or 0x…" />
      <div className="t-agent-picker">{available.filter((agent) => !ids.includes(agent.id) && `${agent.name} ${agent.id}`.toLowerCase().includes(query.toLowerCase())).map((agent) => <button type="button" className="t-picker-row" key={agent.id} onClick={() => { update('ids', [...ids, agent.id].slice(0, 4).join(',')); setAdding(false); setQuery('') }}><AvatarRing agent={agent} /><span>{agent.name}<small>{shortAddress(agent.id)}</small></span><span aria-hidden="true">+</span></button>)}</div>
      {!available.some((agent) => !ids.includes(agent.id) && `${agent.name} ${agent.id}`.toLowerCase().includes(query.toLowerCase())) && <p>No matching agents. Try a different name or wallet.</p>}
    </FloatingCard>}
  </>
}
