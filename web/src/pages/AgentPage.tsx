import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { FEES, TOKEN } from '../config'
import { type Agent, type Range, isBoosted, useAgents } from '../lib/agents'
import { useToken, vaultOpenTokens } from '../lib/token'
import { burnBoost, connect, hasWallet, txUrl } from '../lib/wallet'
import { baumLinks } from '../lib/baum'
import { depositSource, operatorLink, platformShare, recordLanding } from '../lib/attribution'
import { AgentTags, Avatar, Loading, RangeChips, Sparkline, pct, tokens, tone, usd } from '../components/ui'

export default function AgentPage() {
  const { id = '' } = useParams()
  const { search } = useLocation()
  const agents = useAgents()
  const token = useToken()
  const [range, setRange] = useState<Range>('7d')
  useEffect(() => recordLanding(id, search), [id, search])

  if (!agents) return <Loading />
  const agent = agents.find((a) => a.id.toLowerCase() === id.toLowerCase())
  if (!agent) return <p>No agent with that address. <Link to="/agents">Browse agents</Link></p>

  const share = platformShare(depositSource(agent.id))

  return (
    <>
      <div className="section-head">
        <div className="row" style={{ gap: 14 }}>
          <Avatar agent={agent} />
          <div>
            <h1 style={{ fontSize: 32, margin: 0 }}>{agent.name}</h1>
            <div className="row" style={{ gap: 6 }}>
              <AgentTags agent={agent} />
              {isBoosted(agent) && <span className="tag boost">Boosted</span>}
              {agent.vault && <span className="tag vault">Vault</span>}
              {agent.sample && <span className="tag">Sample</span>}
              <span className="muted num" style={{ fontSize: 13 }}>{agent.id.slice(0, 10)}…{agent.id.slice(-6)}</span>
            </div>
          </div>
        </div>
        <RangeChips range={range} onChange={setRange} />
      </div>
      <p>{agent.description}</p>
      {!agent.declared && !agent.sample && (
        <p className="note">Listed under {agent.category} as a suggestion from its trades. Own this wallet? Send <span className="num">/agent strategy</span> to Baum in Telegram to choose its category.</p>
      )}

      {agent.trader && (
      <div className="stats">
          <div className="card stat"><div className="label">PnL ({range})</div><div className={`value num ${tone(agent.pnlUsd[range])}`}>{usd(agent.pnlUsd[range], true)}</div></div>
          {Number.isFinite(agent.returnPct[range]) && <div className="card stat"><div className="label">Return ({range})</div><div className={`value num ${tone(agent.returnPct[range])}`}>{pct(agent.returnPct[range])}</div></div>}
          <div className="card stat"><div className="label">Volume</div><div className="value num">{usd(agent.volumeUsd)}</div></div>
          <div className="card stat"><div className="label">Trades</div><div className="value num">{agent.trades}</div></div>
          {Number.isFinite(agent.winRate) && <div className="card stat"><div className="label">Win rate{agent.winTrades ? ` (${agent.winTrades} trades)` : ''}</div><div className="value num">{Math.round(agent.winRate * 100)}%</div></div>}
        </div>
      )}
      {agent.lp && (
        <>
          <h2 style={{ marginTop: agent.trader ? 28 : 0 }}>Liquidity provision</h2>
          <div className="stats">
            <div className="card stat"><div className="label">Fees ({range})</div><div className={`value num ${tone(agent.lp.feesUsd[range])}`}>{usd(agent.lp.feesUsd[range], true)}</div></div>
            <div className="card stat"><div className="label">Liquidity</div><div className="value num">{usd(agent.lp.liquidityUsd)}</div></div>
            <div className="card stat"><div className="label">Fee APR</div><div className="value num">{agent.lp.feeAprPercent === null ? '—' : `${agent.lp.feeAprPercent.toFixed(1)}%`}</div></div>
            <div className="card stat"><div className="label">Positions</div><div className="value num">{agent.lp.positions}</div></div>
          </div>
          {agent.lp.pools.length > 0 && <p className="note">Pools: {agent.lp.pools.join(', ')}</p>}
        </>
      )}

      {agent.equity.length > 1 && (
        <div className="card section" style={{ overflow: 'hidden' }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Equity, last 30 days</div>
          <Sparkline values={agent.equity} width={1080} height={160} fluid />
        </div>
      )}

      <div className="grid section">
        <div className="card">
          <h3>Copy this agent</h3>
          <p>Baum opens in Telegram with this agent ready to copy. Auto-copy of agents is rolling out during the beta.</p>
          <a className="btn primary" href={baumLinks.copy(agent.id)} target="_blank" rel="noreferrer">Copy on Baum</a>
        </div>

        <div className="card">
          <h3>Vault</h3>
          {agent.vault ? (
            <>
              <p className="num" style={{ marginBottom: 6 }}>TVL {usd(agent.vault.tvlUsd)} · {agent.vault.depositors} depositors · {agent.vault.feePct}% performance fee</p>
              <p className="note">Of the operator's fee, the platform keeps {share * 100}% ({share === FEES.platformShareDirect ? 'you came from the operator\'s link' : 'you found it here'}).</p>
              <button className="btn" disabled>Deposit (coming soon)</button>
            </>
          ) : (
            <>
              <p>This agent doesn't take deposits. Operators open a vault for {tokens(vaultOpenTokens(token?.priceUsd))} {TOKEN.symbol}{token?.priceUsd ? ` (about ${usd(vaultOpenTokens(token.priceUsd) * token.priceUsd)})` : ` or $${FEES.vaultOpenUsd} of it, whichever is less`}.</p>
              <Link className="btn" to="/vaults">About vaults</Link>
            </>
          )}
        </div>

        <BoostCard agent={agent} />

        {agent.vault && <OperatorShare agent={agent} />}
      </div>
    </>
  )
}

// The operator's own link to their vault, for them to share. Deposits through it
// pay the platform less, so only the vault's operator sees it: they prove it by
// connecting the agent's wallet.
function OperatorShare({ agent }: { agent: Agent }) {
  const [account, setAccount] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const isOperator = account.toLowerCase() === agent.id.toLowerCase()

  async function check() {
    setError('')
    try {
      setAccount(await connect())
    } catch (err) {
      if ((err as { code?: number }).code !== 4001) setError((err as Error).message ?? String(err))
    }
  }

  return (
    <div className="card">
      <h3>Run this vault?</h3>
      {isOperator ? (
        <>
          <p>Your own link. Deposits through it pay the platform {FEES.platformShareDirect * 100}% of your fees instead of {FEES.platformShareDiscovered * 100}%.</p>
          <button className="btn" onClick={() => navigator.clipboard?.writeText(operatorLink(agent.id)).then(() => setCopied(true))}>
            {copied ? 'Copied' : 'Copy operator link'}
          </button>
        </>
      ) : (
        <>
          <p>Connect the agent's wallet to get your operator link.</p>
          {account && <p className="note">{account.slice(0, 6)}…{account.slice(-4)} isn't this vault's operator.</p>}
          <button className="btn" onClick={check} disabled={!hasWallet()}>Connect wallet</button>
          {error && <p className="note down">{error}</p>}
        </>
      )}
    </div>
  )
}

function BoostCard({ agent }: { agent: Agent }) {
  const [hours, setHours] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tx, setTx] = useState('')
  const live = Boolean(TOKEN.address) && !agent.sample

  async function burn() {
    setBusy(true)
    setError('')
    setTx('')
    try {
      const account = await connect()
      setTx(await burnBoost(account, agent.id, hours))
    } catch (err) {
      // 4001: the person rejected it in their wallet, which needs no message.
      if ((err as { code?: number }).code !== 4001) setError((err as Error).message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h3>Boost</h3>
      <p>Burn {tokens(FEES.boostPerHour)} {TOKEN.symbol} an hour to feature this agent at the top of {agent.categories.join(' and ')} and on the home page.</p>
      {isBoosted(agent) && <p className="note">Boosted until {new Date(agent.boostedUntil!).toLocaleString()}. Burning more adds to it.</p>}
      <div className="row">
        <select value={hours} onChange={(e) => setHours(Number(e.target.value))} style={{ width: 'auto' }}>
          {[1, 6, 24, 72, 168].map((h) => <option key={h} value={h}>{h < 24 ? `${h}h` : `${h / 24}d`}</option>)}
        </select>
        <button className="btn boost" disabled={!live || busy} onClick={burn}>
          {busy ? 'Confirm in your wallet…' : `Burn ${tokens(FEES.boostPerHour * hours)} ${TOKEN.symbol}`}
        </button>
      </div>
      <p className="note" style={{ marginTop: 8, marginBottom: 0 }}>
        {!TOKEN.address ? `Opens when ${TOKEN.symbol} launches.`
          : agent.sample ? 'Sample agents can\'t be boosted.'
          : tx ? <>Burned. <a href={txUrl(tx)} target="_blank" rel="noreferrer">View transaction</a>. The boost shows here within 10 minutes.</>
          : error ? <span className="down">{error}</span>
          : !hasWallet() ? 'Needs a browser wallet with ' + TOKEN.symbol + ' on Robinhood Chain.'
          : `Sent from your wallet on Robinhood Chain. The tokens go to the dead address.`}
      </p>
    </div>
  )
}
