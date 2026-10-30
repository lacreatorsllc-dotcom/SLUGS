import { useState } from 'react'
import { CHAIN, FEES, TOKEN } from '../config'
import Icon from '../components/terminal/Icon'
import { IconButton } from '../components/terminal/ui'
import { compact, count, money, price } from '../lib/terminal-format'
import { baumLinks, buyUrl } from '../lib/baum'
import { useTerminalData } from '../lib/terminal-context'

export default function Swap() {
  const { snapshot } = useTerminalData()
  const token = snapshot?.token
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [currency, setCurrency] = useState('ETH')
  const [amount, setAmount] = useState('')
  const pay = side === 'buy' ? currency : TOKEN.symbol
  const receive = side === 'buy' ? TOKEN.symbol : currency
  const invalid = amount !== '' && (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || !/^\d*\.?\d+$/.test(amount))
  return <div className="t-two-column"><div className="t-content-stack"><h1 className="t-sr-only">Swap</h1>
    <div className="t-market-summary"><img src={`${import.meta.env.BASE_URL}slugs-logo-orange.png`} alt="" /><h2>{TOKEN.symbol} <span className="t-muted">/ {currency}</span></h2><strong>{price(token?.priceUsd)}</strong><dl><div><dt>Market cap</dt><dd>{money(token?.marketCapUsd)}</dd></div><div><dt>Supply</dt><dd>{compact(token?.totalSupply)}</dd></div><div><dt>Burned</dt><dd className="t-accent">{count(token?.burned)}</dd></div><div><dt>Chain</dt><dd>Robinhood</dd></div></dl></div>
    <div className="t-price-chart" aria-label="Price chart placeholder"><div><Icon name="chart" size={24} /><p>[PLACEHOLDER] Price history</p><span>Baum market data will appear here when available.</span></div></div>
  </div><aside className="t-feature-card t-side-panel" aria-label="Swap"><div className="t-segments t-swap-sides" role="group" aria-label="Buy or sell"><button type="button" aria-pressed={side === 'buy'} onClick={() => { setSide('buy'); setAmount('') }}>Buy</button><button type="button" aria-pressed={side === 'sell'} onClick={() => { setSide('sell'); setAmount('') }}>Sell</button></div>
    <div className="t-swap-input"><label htmlFor="swap-amount">You pay</label><div className="t-swap-input-row"><input id="swap-amount" type="text" inputMode="decimal" placeholder="0.0" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={invalid} aria-describedby={invalid ? 'swap-amount-error' : 'swap-note'} /><strong>{pay}</strong></div></div>
    <div className="t-swap-flip"><IconButton icon="counter" label="Flip tokens" variant="outline" onClick={() => { setSide(side === 'buy' ? 'sell' : 'buy'); setAmount('') }} /></div>
    <div className="t-swap-input"><span className="t-fine">You get</span><div className="t-swap-input-row"><span className="t-muted">—</span><strong>{receive}</strong></div><p className="t-placeholder">[PLACEHOLDER] Quote available on Baum</p></div>
    <div className="t-fee-presets" role="group" aria-label="Amount presets">{(side === 'buy' ? ['0.01', '0.1', '0.5'] : ['10000', '100000', '1000000']).map((value) => <button type="button" className="t-chip" key={value} aria-pressed={amount === value} onClick={() => setAmount(value)}>{Number(value) < 1 ? value : count(Number(value))}</button>)}<button type="button" className="t-chip" disabled title="Balance is available on Baum">Max</button></div>
    {invalid && <p id="swap-amount-error" className="t-negative t-fine">Enter an amount greater than zero.</p>}
    <div><label htmlFor="swap-currency">{side === 'buy' ? 'Pay with' : 'Receive'}</label><select id="swap-currency" value={currency} onChange={(event) => { setCurrency(event.target.value); setAmount('') }}>{['ETH', 'BAUM', 'USDC'].filter((symbol) => symbol !== TOKEN.symbol).map((symbol) => <option key={symbol}>{symbol}</option>)}</select></div>
    <div className="t-summary-box"><div className="t-key-value"><span>Route</span><strong>Baum</strong></div><div className="t-key-value"><span>Platform fee</span><strong>+{FEES.swapBps} bps (in-page swaps)</strong></div><div className="t-key-value"><span>Network</span><strong>{CHAIN.name}</strong></div></div>
    <a className="t-submit" href={buyUrl()} target="_blank" rel="noreferrer"><Icon name="arrow" />Trade {TOKEN.symbol} on Baum</a>
    <p className="t-fine" id="swap-note">In-page swaps open when Baum’s partner swap API is ready. Review the amount, pair, and fees on Baum; these preview inputs are not carried over. You can also use <a href={baumLinks.ref()} target="_blank" rel="noreferrer">Baum on Telegram ↗</a>.</p>
  </aside></div>
}
