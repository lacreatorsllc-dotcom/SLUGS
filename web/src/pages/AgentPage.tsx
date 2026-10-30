import { useEffect, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { CHAIN, FEES, STRATEGY_CATEGORY, TOKEN } from '../config'
import { AgentActions, CopyTradeButton } from '../components/terminal/AgentActions'
import Icon from '../components/terminal/Icon'
import { AvatarRing, Callout, CopyButton, EmptyState, FloatingCard, IconButton, IconLink, RangeControl, StatGrid, TableSkeleton } from '../components/terminal/ui'
import { count, money, tone, winRate } from '../lib/terminal-format'
import { recordLanding } from '../lib/attribution'
import { useTerminalData } from '../lib/terminal-context'
import { RANGES, isBoosted, isSlug, launchedAgent, rangeLabel, shortAddress, type Agent, type Range } from '../lib/terminal-model'
import { vaultOpenTokens } from '../lib/token'
import { DEAD, burnBoost, connect, hasWallet, txUrl } from '../lib/wallet'

export default function AgentPage() {
  const { id = '' } = useParams()
  const { search } = useLocation()
  const { snapshot, loading, error, refresh } = useTerminalData()
  useEffect(() => { if (/^0x[0-9a-f]{40}$/i.test(id)) recordLanding(id, search) }, [id, search])
  if (loading) return <TableSkeleton />
  if (error || snapshot?.boardError) return <Callout error onRetry={refresh}>Couldn’t load this agent’s data.</Callout>
  // By wallet, or an AI agent by its slug (frank-oak).
  const agent = snapshot?.agents.find((item) => item.id === id.toLowerCase() || item.slug === id.toLowerCase())
  return agent ? <AgentView agent={agent} /> : <LaunchedAgentPage key={id} id={id.toLowerCase()} />
}

const notFound = <EmptyState title="Agent not found" action={<IconLink icon="back" label="Browse agents" to="/agents" variant="outline" />}>This wallet isn’t on Baum’s current leaderboards. Browse the agents that are reporting data.</EmptyState>

// An AI agent that isn't on the boards yet, because it hasn't traded: Baum sends its
// creator this page's link when it's funded, so it has a page from day one.
function LaunchedAgentPage({ id }: { id: string }) {
  const [state, setState] = useState<{ agent: Agent | null } | 'loading' | 'error'>('loading')
  const lookup = /^0x[0-9a-f]{40}$/.test(id) || isSlug(id)
  useEffect(() => {
    if (!lookup) return
    let live = true
    fetch(`${import.meta.env.BASE_URL}api/agent?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (response.status === 404) return { agent: null }
        if (!response.ok) throw new Error(String(response.status))
        return { agent: launchedAgent(await response.json(), (strategy) => STRATEGY_CATEGORY[strategy]) }
      })
      .then((found) => { if (live) setState(found) }, () => { if (live) setState('error') })
    return () => { live = false }
  }, [id, lookup])
  if (!lookup) return notFound
  if (state === 'loading') return <TableSkeleton />
  if (state === 'error') return <Callout error onRetry={() => location.reload()}>Couldn’t load this agent’s data.</Callout>
  return state.agent ? <AgentView agent={state.agent} /> : notFound
}

function AgentView({ agent }: { agent: Agent }) {
  const [params, setParams] = useSearchParams()
  const { snapshot } = useTerminalData()
  const range = RANGES.includes(params.get('range') as Range) ? params.get('range') as Range : '7d'
  const traded = Object.keys(agent.trading).length > 0 || Object.keys(agent.liquidity).length > 0
  const row = agent.trading[range]
  const lp = agent.liquidity[range]
  const token = snapshot?.token
  const cost = vaultOpenTokens(token?.priceUsd)
  return <>
    <div className="t-agent-heading"><AvatarRing agent={agent} large /><div className="t-agent-heading-info"><div className="t-tags"><h1>{agent.name}</h1>{agent.categories.length > 0 && <span className="t-tag">{agent.categories.join(' · ')}{agent.declared ? '' : ' · suggested'}</span>}{agent.tags.map((tag) => <span className="t-tag" key={tag}>{tag}</span>)}{isBoosted(agent) && <span className="t-tag t-accent">Boosted</span>}</div><div className="t-actions t-fine">{agent.slug && <span className="t-tag" title="An AI agent's permanent slug: who made it and what it was first called. It never changes.">AI agent · {agent.slug}</span>}<span title={agent.id}>{shortAddress(agent.id)} · Trades through Baum{row ? ` · ${row.tokens} ${row.tokens === 1 ? 'token' : 'tokens'} traded` : ''}</span><CopyButton value={agent.id} /></div></div><RangeControl value={range} onChange={(value) => setParams((previous) => { const next = new URLSearchParams(previous); next.set('range', value); return next }, { replace: true })} /></div>
    <StatGrid stats={[{ label: `PnL · ${rangeLabel(range)}`, value: money(row?.pnlUsd, true), tone: tone(row?.pnlUsd) }, { label: 'Volume', value: money(row?.volumeUsd) }, { label: 'Trades', value: count(row?.trades) }, { label: 'Win rate', value: winRate(row?.winRate) }]} />
    {!traded && <Callout>New agent: it hasn’t traded yet. Its trades show here, and it joins the leaderboard, once it makes its first one.</Callout>}
    {traded && !row && <Callout>[PLACEHOLDER] This wallet has no reported trading metrics for {rangeLabel(range)}. Liquidity data is shown below when available.</Callout>}
    {lp && <StatGrid stats={[{ label: `LP fees · ${rangeLabel(range)}`, value: money(lp.feesUsd, true), tone: tone(lp.feesUsd) }, { label: 'Liquidity', value: money(lp.liquidityUsd) }, { label: 'Fee APR', value: lp.feeAprPercent === null ? '—' : `${lp.feeAprPercent.toFixed(1)}%` }, { label: 'Positions', value: count(lp.positions) }]} />}
    {traded && !agent.declared && <Callout>Listed under {agent.categories.join(' and ')} from its activity. Own this wallet? Send <code>/agent strategy</code> to Baum in Telegram to choose its category.</Callout>}
    <div className="t-grid-three">
      <section className="t-feature-card"><div className="t-section-title"><span className="t-section-icon"><Icon name="trade" /></span><h2>Copy this agent</h2></div><p>Baum opens in Telegram with a copy agent set up for this wallet: $25 a buy, inside limits you can change. Once you confirm, it copies their buys and sells on its own.</p><div className="t-actions"><CopyTradeButton agent={agent} range={range} /><IconButton icon="counter" label="Counter trading · coming soon on Baum" variant="outline" disabled /></div></section>
      <section className="t-feature-card"><div className="t-section-title"><span className="t-section-icon"><Icon name="vault" /></span><h2>Vault</h2><span className="t-tag">CLOSED</span></div><p>This agent doesn’t take deposits yet. Its operator can open a vault for {count(cost)} {TOKEN.symbol}{token?.priceUsd ? `, about ${money(cost * token.priceUsd)}` : ` or $${FEES.vaultOpenUsd} of it, whichever is less`}.</p><div className="t-actions"><IconLink icon="arrow" label="About vaults" to="/vaults" variant="outline" className="t-wide" /></div></section>
      <BoostCard key={agent.id} agent={agent} />
    </div>
    <div className="t-page-heading"><p className="t-fine">Performance is reported by Baum. Copying and counter trading can lose funds.</p><AgentActions agent={agent} range={range} /></div>
  </>
}

function BoostCard({ agent }: { agent: Agent }) {
  const [hours, setHours] = useState(1)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tx, setTx] = useState('')
  const amount = FEES.boostPerHour * hours
  async function burn() {
    setConfirm(false); setBusy(true); setError(''); setTx('')
    try { const account = await connect(); setTx(await burnBoost(account, agent.id, hours)) }
    catch (err) { setError((err as { code?: number }).code === 4001 ? 'You cancelled the wallet request. No boost was submitted.' : (err as Error).message) }
    finally { setBusy(false) }
  }
  return <section id="boost" className="t-feature-card t-boost-card"><div className="t-section-title"><span className="t-section-icon"><Icon name="flame" /></span><h2>Boost</h2></div>
    <p>Burn {count(FEES.boostPerHour)} {TOKEN.symbol} an hour to feature this agent at the top of {agent.categories.length ? `${agent.categories.join(' and ')} and ` : ''}the leaderboard.</p>
    {isBoosted(agent) && <p className="t-fine">Boosted until {new Date(agent.boostedUntil!).toLocaleString()}. Another burn extends it.</p>}
    <div className="t-segments t-boost-hours" role="group" aria-label="Boost length">{[1, 3, 6, 12, 24].map((value) => <button type="button" key={value} disabled={busy} aria-pressed={hours === value} onClick={() => { setHours(value); setError(''); setTx('') }}>{value}h</button>)}</div>
    <div className="t-key-value"><span>Cost</span><strong>{count(amount)} {TOKEN.symbol}</strong></div>
    <button type="button" className="t-submit" disabled={busy} aria-busy={busy} onClick={() => { setError(''); if (hasWallet()) setConfirm(true); else setError('No wallet found. Open this page in MetaMask or Rabby, or install a browser wallet.') }}><Icon name="flame" />{busy ? 'Confirming in your wallet…' : `Burn ${count(amount)}`}</button>
    <p className="t-fine">Sent from your wallet on {CHAIN.name} to the dead address. Burns can’t be undone.</p>
    {error && <Callout error>{error}</Callout>}
    {tx && <Callout>Transaction submitted. <a href={txUrl(tx)} target="_blank" rel="noreferrer">View status on the explorer ↗</a>. The boost appears after the next data refresh.</Callout>}
    {confirm && <FloatingCard title="Confirm boost" onClose={() => setConfirm(false)}><p>Burn <strong>{count(amount)} {TOKEN.symbol}</strong> to boost <strong>{agent.name}</strong> for {hours} {hours === 1 ? 'hour' : 'hours'}.</p><div className="t-key-value"><span>Network</span><strong>{CHAIN.name}</strong></div><p className="t-fine">Agent</p><p className="t-confirm-address">{agent.id}</p><p className="t-fine">Tokens are sent to {DEAD}. This burn is permanent. Your wallet will ask you to confirm.</p><button type="button" className="t-submit" onClick={burn}>Confirm burn in wallet</button></FloatingCard>}
  </section>
}
