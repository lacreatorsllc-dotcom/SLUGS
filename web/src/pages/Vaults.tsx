import { useState } from 'react'
import { FEES, TOKEN } from '../config'
import Icon from '../components/terminal/Icon'
import { EmptyState, IconLink, StatGrid } from '../components/terminal/ui'
import { count, money } from '../lib/terminal-format'
import { baumLinks } from '../lib/baum'
import { useTerminalData } from '../lib/terminal-context'
import { vaultOpenTokens } from '../lib/token'

export default function Vaults() {
  const { snapshot } = useTerminalData()
  const token = snapshot?.token
  const [fee, setFee] = useState('20')
  const cost = vaultOpenTokens(token?.priceUsd)
  const validFee = fee.trim() !== '' && Number.isFinite(Number(fee)) && Number(fee) >= 0 && Number(fee) <= 100
  return <div className="t-two-column"><div className="t-content-stack">
    <div className="t-page-heading"><div><div className="t-tags"><h1>Vaults</h1><span className="t-tag">DEPOSITS OPEN LATER IN BETA</span></div><p>Permissionless vaults let operators take deposits into their strategy and charge a performance fee.</p></div></div>
    <StatGrid stats={[{ label: 'Open a vault', value: `${count(FEES.vaultOpenTokens)} ${TOKEN.symbol}`, note: `or $${FEES.vaultOpenUsd} of ${TOKEN.symbol}, whichever is less` }, { label: 'Platform share', value: `${FEES.platformShareDiscovered * 100}% / ${FEES.platformShareDirect * 100}%`, note: 'found here / via the operator’s link' }, { label: 'Boost a vault', value: `${count(FEES.boostPerHour)} / hour`, note: 'burned, pins it to the top of this page', tone: 't-accent' }]} />
    <section className="t-panel"><div className="t-panel-head"><h2>Open vaults <span className="t-muted">· 0</span></h2><span className="t-tag">COMING SOON</span></div><div className="t-vault-table-head" aria-hidden="true"><span>Vault</span><span>PnL 7D</span><span>Deposits</span><span>Perf. fee</span></div><EmptyState title="No vaults open yet" icon="vault" action={<><IconLink icon="rocket" label="Deploy your slug on Baum" href={baumLinks.launch()} variant="primary" /><IconLink icon="bot" label="Register an agent on Baum" href={baumLinks.register()} variant="outline" /></>}>Run an agent, then open a vault so others can deposit into its strategy. Deposits unlock later in the beta.</EmptyState></section>
  </div><aside className="t-feature-card t-side-panel" aria-label="Open a vault"><div className="t-section-title"><span className="t-section-icon"><Icon name="plus" /></span><h2>Open a vault</h2></div>
    <div><label htmlFor="vault-agent">Agent</label><select id="vault-agent" disabled><option>Connect an agent when vaults open</option></select></div>
    <div><label htmlFor="vault-fee">Performance fee</label><div className="t-input-unit"><input id="vault-fee" type="number" inputMode="decimal" min="0" max="100" step="0.1" value={fee} onChange={(event) => setFee(event.target.value)} aria-invalid={!validFee} aria-describedby={validFee ? undefined : 'vault-fee-error'} /><span>%</span></div><div className="t-fee-presets" role="group" aria-label="Performance fee presets">{[10, 20, 30, 50].map((value) => <button type="button" key={value} className="t-chip" aria-pressed={Number(fee) === value} onClick={() => setFee(String(value))}>{value}%</button>)}</div>{!validFee && <p id="vault-fee-error" className="t-negative t-fine">Enter a performance fee from 0 to 100%.</p>}</div>
    <div className="t-summary-box"><div className="t-key-value"><span>Cost to open</span><strong>{count(cost)} {TOKEN.symbol}</strong></div><div className="t-key-value"><span>≈ USD</span><strong>{token?.priceUsd ? money(cost * token.priceUsd) : '—'}</strong></div><div className="t-key-value"><span>Your share of fees</span><strong>{(1 - FEES.platformShareDiscovered) * 100}–{(1 - FEES.platformShareDirect) * 100}%</strong></div></div>
    <button type="button" className="t-submit t-submit--secondary" disabled><Icon name="lock" />Opens later in the beta</button><p className="t-fine">Preview the terms here. Opening a vault and deposits are not available yet.</p>
  </aside></div>
}
