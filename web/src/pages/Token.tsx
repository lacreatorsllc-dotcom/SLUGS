import { FEES, FEE_SPLIT, TOKEN } from '../config'
import { Link } from 'react-router-dom'
import { tokens, usd } from '../components/ui'
import { buyUrl } from '../lib/baum'
import { useToken, vaultOpenTokens } from '../lib/token'
import { tokenUrl, txUrl } from '../lib/wallet'

const COLORS = ['var(--down)', 'var(--boost)', 'var(--accent)', 'var(--text-muted)']

const price = (n: number) => (n >= 0.01 ? usd(n) : `$${n.toPrecision(3)}`)

export default function Token() {
  const token = useToken()
  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 36 }}>${TOKEN.symbol}</h1>
      <p>
        The platform token. You burn it to boost an agent and spend it to open a vault, and platform fees buy it back.
        {!TOKEN.address && ' It is not launched yet.'}
      </p>

      {TOKEN.address && (
        <section className="section">
          <div className="row" style={{ marginBottom: 14 }}>
            <a className="btn primary" href={buyUrl()} target="_blank" rel="noreferrer">Buy {TOKEN.symbol} on Baum</a>
            <a className="btn" href={tokenUrl()} target="_blank" rel="noreferrer">Explorer</a>
            <button className="btn" onClick={() => navigator.clipboard?.writeText(TOKEN.address)}>Copy address</button>
          </div>
          <p className="note num" style={{ wordBreak: 'break-all' }}>{TOKEN.address} · Robinhood Chain</p>
          {token && (
            <div className="stats">
              <div className="card stat"><div className="label">Price</div><div className="value num">{token.priceUsd ? price(token.priceUsd) : '—'}</div></div>
              <div className="card stat"><div className="label">Market cap</div><div className="value num">{token.marketCapUsd ? usd(token.marketCapUsd) : '—'}</div></div>
              <div className="card stat"><div className="label">Burned</div><div className="value num">{tokens(Math.round(token.burned))}</div></div>
              <div className="card stat"><div className="label">Burned on boosts</div><div className="value num">{tokens(Math.round(token.boostBurned))}</div></div>
            </div>
          )}
          {token && token.recentBoosts.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table>
                <thead><tr><th>Recent boosts</th><th className="r">Burned</th><th className="r hide-sm">When</th></tr></thead>
                <tbody>
                  {token.recentBoosts.slice(0, 10).map((b) => (
                    <tr key={b.tx}>
                      <td><Link to={`/agents/${b.agent}`} className="num">{b.agent.slice(0, 6)}…{b.agent.slice(-4)}</Link></td>
                      <td className="r num"><a href={txUrl(b.tx)} target="_blank" rel="noreferrer">{tokens(Math.round(b.amount))}</a></td>
                      <td className="r hide-sm">{new Date(b.at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="section">
        <h2>Where fees go</h2>
        <p>Platform revenue (Baum referral fees, vault fee shares, swap fees) is split:</p>
        <div className="split" aria-hidden="true">
          {FEE_SPLIT.map((s, i) => <span key={s.key} style={{ width: `${s.share * 100}%`, background: COLORS[i] }} />)}
        </div>
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table>
            <tbody>
              {FEE_SPLIT.map((s, i) => (
                <tr key={s.key}>
                  <td><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: COLORS[i], marginRight: 8 }} />{s.label}</td>
                  <td className="r num">{s.share * 100}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2>Uses</h2>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><td>Boost an agent or vault</td><td className="r num">{tokens(FEES.boostPerHour)} / hour, burned</td></tr>
              <tr><td>Open a vault</td><td className="r num">{tokens(vaultOpenTokens(token?.priceUsd))}{token?.priceUsd ? ` (min of ${tokens(FEES.vaultOpenTokens)} or $${FEES.vaultOpenUsd})` : ` or $${FEES.vaultOpenUsd}, whichever is less`}</td></tr>
              <tr><td>Weekly prize</td><td className="r">Top 3 strategies on the 7d leaderboard</td></tr>
              <tr><td>Staking</td><td className="r">Earn the stakers' share and vote (coming later)</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2>Platform fees</h2>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><td>Vault fees, depositor found it here</td><td className="r num">{FEES.platformShareDiscovered * 100}%</td></tr>
              <tr><td>Vault fees, depositor came from the operator's link</td><td className="r num">{FEES.platformShareDirect * 100}%</td></tr>
              <tr><td>Swap page</td><td className="r num">+{FEES.swapBps} bps</td></tr>
              <tr><td>Baum trading fees from referred users</td><td className="r">Baum's referral share</td></tr>
            </tbody>
          </table>
        </div>
        <p className="callout" style={{ marginTop: 14 }}>Beta: these numbers can change. Boost burns are on-chain; vaults and the fee split aren't yet.</p>
      </section>
    </div>
  )
}
