import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CHAIN } from '../../config'
import { baumLinks } from '../../lib/baum'
import { useTerminalData } from '../../lib/terminal-context'
import { rangeLabel, shortAddress, sortedAgents, type Agent, type Range } from '../../lib/terminal-model'
import { AvatarRing, CopyButton, FloatingCard, IconButton, IconLink, StatGrid } from './ui'
import { count, money, tone } from '../../lib/terminal-format'

type Overlay = { kind: 'pnl' | 'copy'; agent: Agent; range: Range }
const Context = createContext<((overlay: Overlay) => void) | null>(null)

export function AgentOverlayProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const { snapshot } = useTerminalData()
  const agent = overlay?.agent
  const row = agent && overlay ? agent.trading[overlay.range] : undefined
  const rank = agent && overlay ? sortedAgents((snapshot?.agents ?? []).filter((item) => item.trading[overlay.range]), overlay.range).findIndex((item) => item.id === agent.id) + 1 : 0
  return <Context.Provider value={setOverlay}>{children}{overlay && agent && <FloatingCard key={`${overlay.kind}-${agent.id}`} title={overlay.kind === 'pnl' ? 'PnL card' : 'Copy on Baum'} onClose={() => setOverlay(null)} className={overlay.kind === 'pnl' ? 't-pnl-card' : ''}>
    {overlay.kind === 'pnl' ? <>
      <div className="t-pnl-header"><img src={`${import.meta.env.BASE_URL}slugs-logo-orange.png`} alt="SLUGS" /><span className="t-fine">PNL · {rangeLabel(overlay.range)}</span></div>
      <div className="t-actions"><AvatarRing agent={agent} /><strong>{agent.name}</strong></div>
      <div className={`t-pnl-number ${tone(row?.pnlUsd)}`}>{money(row?.pnlUsd, true)}</div>
      {!row && <p className="t-placeholder">[PLACEHOLDER] Trading performance is not available for this range.</p>}
      <StatGrid stats={[{ label: 'Volume', value: money(row?.volumeUsd) }, { label: 'Trades', value: count(row?.trades) }, { label: 'Rank', value: rank ? `#${rank}` : '—' }]} />
      <div className="t-key-value"><span>slugs.run</span><span>{CHAIN.name}</span></div>
      <div className="t-actions"><CopyButton value={`${location.origin}${import.meta.env.BASE_URL}agents/${agent.id}`} label="Copy agent link" /><span className="t-fine">Copy agent link</span></div>
    </> : <>
      <div className="t-actions"><AvatarRing agent={agent} /><strong>{agent.name}</strong></div>
      <p>Baum opens in Telegram with a copy agent set up for this wallet: $25 a buy, inside limits you can change. Once you confirm the plan, it copies their buys and sells on its own.</p>
      <p className="t-fine">Nothing is copied until you press Confirm in Baum. Opening this link does not move funds.</p>
      <a className="t-submit" href={baumLinks.copy(agent.id)} target="_blank" rel="noreferrer" onClick={() => setOverlay(null)}>Open Baum in Telegram</a>
    </>}
  </FloatingCard>}</Context.Provider>
}

export function AgentActions({ agent, range, compact = false }: { agent: Agent; range: Range; compact?: boolean }) {
  const open = useContext(Context)!
  return <div className="t-row-actions">
    <IconButton icon="trade" label={`Copy trade ${agent.name}`} onClick={() => open({ kind: 'copy', agent, range })} />
    <IconButton icon="counter" label="Counter trading · coming soon on Baum" disabled />
    {!compact && <><IconLink icon="compare" label={`Compare ${agent.name}`} to={`/agents/compare?ids=${agent.id}&range=${range}`} /><IconButton icon="chart" label={`Show PnL card for ${agent.name}`} onClick={() => open({ kind: 'pnl', agent, range })} /></>}
    <IconLink icon="chevron" label={`Open ${agent.name}`} to={`/agents/${agent.id}?range=${range}`} />
  </div>
}

export function CopyTradeButton({ agent, range }: { agent: Agent; range: Range }) {
  const open = useContext(Context)!
  return <IconButton icon="trade" label={`Copy ${agent.name} on Baum`} variant="primary" className="t-wide" onClick={() => open({ kind: 'copy', agent, range })} />
}

export function CompareActions({ agent, range }: { agent: Agent; range: Range }) {
  const open = useContext(Context)!
  return <div className="t-compare-actions">
    <CopyTradeButton agent={agent} range={range} />
    <IconButton icon="counter" label="Counter trading · coming soon on Baum" variant="outline" disabled className="t-wide" />
    <IconLink icon="vault" label="Allocate to a vault · deposits open later in beta" to="/vaults" variant="outline" className="t-wide" />
    <IconButton icon="chart" label={`Show PnL card for ${agent.name}`} variant="outline" className="t-wide" onClick={() => open({ kind: 'pnl', agent, range })} />
  </div>
}

export function AgentIdentity({ agent, range }: { agent: Agent; range: Range }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const row = agent.trading[range]
  useEffect(() => {
    if (!position) return
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setPosition(null) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPosition(null) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [position])
  useEffect(() => () => window.clearTimeout(timeout.current), [])
  function show() {
    window.clearTimeout(timeout.current)
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setPosition({ top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 290)), left: Math.max(12, Math.min(rect.left, window.innerWidth - 372)) })
  }
  return <div ref={ref} className="t-identity" onMouseEnter={() => { if (matchMedia('(hover: hover)').matches) show() }} onMouseLeave={() => { timeout.current = setTimeout(() => setPosition(null), 180) }}>
    <button type="button" className="t-avatar-trigger" aria-label={`Preview ${agent.name}`} aria-expanded={Boolean(position)} onClick={() => position ? setPosition(null) : show()}><AvatarRing agent={agent} /></button>
    <Link className="t-agent-name" to={`/agents/${agent.id}?range=${range}`}>{agent.name}</Link><CopyButton value={agent.id} label={`Copy ${agent.name} wallet address`} />
    {position && <div className="t-hover-card" role="dialog" aria-label={`${agent.name} agent card`} style={position}>
      <div className="t-hover-header"><AvatarRing agent={agent} /><div><Link to={`/agents/${agent.id}`} className="t-agent-name">{agent.name}</Link><p>{agent.categories.join(' · ')}{agent.declared ? '' : ' · suggested'} · {shortAddress(agent.id)}</p></div><IconButton icon="close" label="Close agent preview" onClick={() => setPosition(null)} /></div>
      {agent.tags.length > 0 && <div className="t-tags">{agent.tags.map((tag) => <span className="t-tag" key={tag}>{tag}</span>)}</div>}
      <StatGrid stats={[{ label: `PnL ${rangeLabel(range)}`, value: money(row?.pnlUsd, true), tone: tone(row?.pnlUsd) }, { label: 'Volume', value: money(row?.volumeUsd) }, { label: 'Trades', value: count(row?.trades) }]} />
      <AgentActions agent={agent} range={range} />
    </div>}
  </div>
}
