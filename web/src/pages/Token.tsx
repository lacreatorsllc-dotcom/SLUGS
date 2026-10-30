import { FEES, FEE_SPLIT, TOKEN, CHAIN } from '../config'
import { Callout, CopyButton, IconLink, StatGrid } from '../components/terminal/ui'
import { compact, count, money, price } from '../lib/terminal-format'
import Icon, { type IconName } from '../components/terminal/Icon'
import { useTerminalData } from '../lib/terminal-context'
import { vaultOpenTokens } from '../lib/token'
import { tokenUrl, txUrl } from '../lib/wallet'

export default function Token() {
  const { snapshot, loading, refresh } = useTerminalData()
  const token = snapshot?.token
  const uses: { icon: IconName; title: string; description: string }[] = [
    { icon: 'flame', title: 'Boost an agent or vault', description: `${count(FEES.boostPerHour)} / hour, burned` },
    { icon: 'vault', title: 'Open a vault', description: `${count(FEES.vaultOpenTokens)} ${TOKEN.symbol} or $${FEES.vaultOpenUsd}, whichever is less` },
    { icon: 'star', title: 'Weekly prize', description: 'Top 3 strategies on the 7d leaderboard' },
    { icon: 'lock', title: 'Staking', description: 'Earn the stakers’ share and vote (coming later)' },
  ]
  return <>
    <div className="t-page-heading"><div><h1>${TOKEN.symbol}</h1><p>The platform token. Burn it to boost an agent, spend it to open a vault, and platform fees buy it back.</p><div className="t-actions t-token-address"><span>{TOKEN.address} · {CHAIN.name}</span><CopyButton value={TOKEN.address} label="Copy token address" /></div></div><div className="t-actions"><IconLink icon="cart" label={`Buy $${TOKEN.symbol}`} to="/swap" variant="primary" /><IconLink icon="flame" label={`Burn $${TOKEN.symbol} to skip the line`} to="/burn" variant="outline" className="t-accent" /><IconLink icon="globe" label="View token on explorer" href={tokenUrl()} variant="outline" /></div></div>
    <StatGrid stats={[{ label: 'Price', value: loading ? '…' : price(token?.priceUsd) }, { label: 'Market cap', value: loading ? '…' : money(token?.marketCapUsd) }, { label: 'Burned', value: loading ? '…' : count(token?.burned), tone: 't-accent' }, { label: 'Supply', value: loading ? '…' : compact(token?.totalSupply) }]} />
    {!loading && !token && <Callout onRetry={refresh}>[PLACEHOLDER] Token statistics are unavailable. Retry to load the latest on-chain snapshot.</Callout>}
    <div className="t-grid-three">
      <section className="t-panel"><div className="t-panel-head"><div><h2>Where fees go</h2><p>Baum referral fees, vault fee shares and swap fees</p></div></div><div className="t-fee-bar" aria-hidden="true">{FEE_SPLIT.map((split, index) => <span key={split.key} className={`t-split-${index}`} style={{ flex: split.share }} />)}</div><dl className="t-detail-list">{FEE_SPLIT.map((split, index) => <div key={split.key}><dt><span className={`t-fee-dot t-split-${index}`} />{split.label}</dt><dd>{Math.round(split.share * 100)}%</dd></div>)}</dl></section>
      <section className="t-panel"><div className="t-panel-head"><div><h2>Uses</h2><p>What $SLUGS does on the platform</p></div></div><div className="t-use-list">{uses.map((use) => <div key={use.title}><span className={`t-section-icon${use.icon === 'flame' ? ' t-accent' : ''}`}><Icon name={use.icon} size={14} /></span><div><h3>{use.title}</h3><p>{use.description}</p></div></div>)}</div></section>
      <section className="t-panel"><div className="t-panel-head"><div><h2>Platform fees</h2><p>What SLUGS earns</p></div></div><dl className="t-detail-list"><div><dt>Vault fees, depositor found it here</dt><dd>{FEES.platformShareDiscovered * 100}%</dd></div><div><dt>Vault fees, depositor came via operator’s link</dt><dd>{FEES.platformShareDirect * 100}%</dd></div><div><dt>Swap page</dt><dd>+{FEES.swapBps} bps</dd></div><div><dt>Baum trading fees from referred users</dt><dd>Baum’s referral share</dd></div></dl></section>
    </div>
    <Callout><span className="t-tag">BETA</span> These numbers can change. Boost burns are on-chain; vaults and the fee split aren’t yet.</Callout>
    {token && <p className="t-fine">Opening a vault would cost {count(vaultOpenTokens(token.priceUsd))} {TOKEN.symbol} at this snapshot. Updated {new Date(token.updatedAt).toLocaleString()}.</p>}
    {Boolean(token?.recentBoosts.length) && <section className="t-panel"><div className="t-panel-head"><h2>Recent boosts</h2></div><div className="t-recent-boosts">{token?.recentBoosts.slice(0, 10).map((boost) => <div className="t-key-value" key={boost.tx}><a href={txUrl(boost.tx)} target="_blank" rel="noreferrer">{boost.agent.slice(0, 6)}…{boost.agent.slice(-4)} ↗</a><strong>{count(boost.amount)} {TOKEN.symbol} burned</strong><span>{new Date(boost.at).toLocaleDateString()}</span></div>)}</div></section>}
  </>
}
