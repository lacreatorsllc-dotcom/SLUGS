import { useEffect, useState } from 'react'
import { CHAIN, TOKEN } from '../config'
import Icon from '../components/terminal/Icon'
import { IconButton } from '../components/terminal/ui'
import { compact, count, money, price } from '../lib/terminal-format'
import { baumLinks, buyUrl } from '../lib/baum'
import { connect, hasWallet, sendBuilt, txUrl } from '../lib/wallet'
import { Callout } from '../components/terminal/ui'
import { useTerminalData } from '../lib/terminal-context'
import { BAUM_FEE_BPS, type Curve, quote, readCurve, readPrices, SLIPPAGE_BPS, SWAP_TOKENS, type SwapToken, tokenBySymbol } from '../lib/quote'

// How often the quote is re-read while the page is open.
const REFRESH_MS = 15_000

const slugs = tokenBySymbol(TOKEN.symbol)
const others = SWAP_TOKENS.filter((t) => t.symbol !== TOKEN.symbol)

// Amounts as people read them: enough digits to matter, never 0.000000001234.
function amount(n: number) {
  if (!Number.isFinite(n) || n === 0) return '0'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return n.toPrecision(4).replace(/\.?0+$/, '')
}

// "1 SLUGS = 4.6e-9 ETH" says nothing to anybody; the side worth more than one goes first.
function rate(from: SwapToken, to: SwapToken, amountIn: number, amountOut: number) {
  const r = amountOut / amountIn
  return r >= 1 || r === 0 ? `1 ${from.symbol} = ${amount(r)} ${to.symbol}` : `1 ${to.symbol} = ${amount(1 / r)} ${from.symbol}`
}

function TokenLogo({ token }: { token: SwapToken }) {
  const [broken, setBroken] = useState(false)
  if (broken) return <span className="t-token-logo t-token-logo--fallback" aria-hidden="true">{token.symbol.slice(0, 2)}</span>
  return <img className="t-token-logo" src={token.logo} alt="" width={20} height={20} onError={() => setBroken(true)} />
}

const TokenName = ({ token }: { token: SwapToken }) => <strong className="t-token-name"><TokenLogo token={token} />{token.symbol}</strong>

const PRESETS: Record<string, string[]> = { ETH: ['0.01', '0.1', '0.5'], USDG: ['10', '50', '250'], BAUM: ['10000', '100000', '1000000'] }

// What Baum's partner swap API answers (baum-monorepo app/api/partner/swap).
type BaumQuote = {
  venue: 'curve' | 'uniswap'
  toAmount: string
  minReceived: string
  feePct: number
  venueFeePct: number | null
  partnerFeePct?: number
  partnerFeeNote?: string
  transaction: { to: string; data: string; value: string; chainId: number }
}

export default function Swap() {
  const { snapshot } = useTerminalData()
  const token = snapshot?.token
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [other, setOther] = useState<SwapToken>(tokenBySymbol('ETH'))
  const [input, setInput] = useState('')
  const [curve, setCurve] = useState<Curve | null>(null)
  const [prices, setPrices] = useState<Record<string, number> | null>(null)
  const [readAt, setReadAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, tick] = useState(0)
  // A swap sent from this page: Baum's quote for the wallet, then the wallet's signature.
  const [trade, setTrade] = useState<{ step: 'idle' | 'quoting' | 'confirm' | 'sending' | 'done'; quote?: BaumQuote; account?: string; hash?: string; error?: string }>({ step: 'idle' })

  useEffect(() => {
    let live = true
    const read = () =>
      Promise.all([readCurve(), readPrices().catch(() => ({}) as Record<string, number>)])
        .then(([c, p]) => {
          if (!live) return
          setCurve(c)
          setPrices(p)
          setReadAt(Date.now())
          setError(null)
        })
        .catch((err) => live && setError((err as Error).message ?? String(err)))
    read()
    const every = setInterval(read, REFRESH_MS)
    const clock = setInterval(() => tick((n) => n + 1), 1000)
    return () => { live = false; clearInterval(every); clearInterval(clock) }
  }, [])

  const buying = side === 'buy'
  const from = buying ? other : slugs
  const to = buying ? slugs : other
  const invalid = input !== '' && (!Number.isFinite(Number(input)) || Number(input) <= 0 || !/^\d*\.?\d+$/.test(input))
  const n = invalid ? 0 : Number(input)
  const q = curve && prices && !curve.graduated && n > 0 ? quote(from, to, n, curve, prices) : null
  const priced = q && q.amountOut > 0 ? q : null
  const ago = readAt ? Math.max(0, Math.round((Date.now() - readAt) / 1000)) : null
  const flip = (next: 'buy' | 'sell') => { setSide(next); setInput(''); setTrade({ step: 'idle' }) }
  const presets = buying ? PRESETS[other.symbol] : ['10000', '100000', '1000000']
  const here = buying && other.symbol === 'ETH' && n > 0
  async function askBaum() {
    setTrade({ step: 'quoting' })
    try {
      if (!hasWallet()) throw new Error('No wallet found in this browser. Open this page in your wallet’s browser, or install MetaMask or Rabby.')
      const account = await connect()
      const res = await fetch('/api/swap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amount: input, address: account }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof body.reason === 'string' ? body.reason : 'Baum couldn’t price that just now.')
      setTrade({ step: 'confirm', quote: body as BaumQuote, account })
    } catch (err) {
      setTrade({ step: 'idle', error: (err as { code?: number }).code === 4001 ? 'You cancelled in your wallet.' : (err as Error).message })
    }
  }
  async function send() {
    if (!trade.quote || !trade.account) return
    const { quote: q2, account } = trade
    setTrade({ ...trade, step: 'sending' })
    try {
      setTrade({ step: 'done', hash: await sendBuilt(account, q2.transaction) })
    } catch (err) {
      setTrade({ step: 'confirm', quote: q2, account, error: (err as { code?: number }).code === 4001 ? 'You cancelled in your wallet. Nothing was sent.' : (err as Error).message })
    }
  }
  const status = error ? `Couldn't read a quote: ${error}` : curve?.graduated ? `${TOKEN.symbol} has graduated to Uniswap; Baum quotes it before you trade.` : 'Enter an amount for a live quote.'

  return <div className="t-two-column"><div className="t-content-stack"><h1 className="t-sr-only">Swap</h1>
    <div className="t-market-summary"><img src={`${import.meta.env.BASE_URL}slugs-logo-orange.png`} alt="" /><h2>{TOKEN.symbol} <span className="t-muted">/ {other.symbol}</span></h2><strong>{price(token?.priceUsd)}</strong><dl><div><dt>Market cap</dt><dd>{money(token?.marketCapUsd)}</dd></div><div><dt>Supply</dt><dd>{compact(token?.totalSupply)}</dd></div><div><dt>Burned</dt><dd className="t-accent">{count(token?.burned)}</dd></div><div><dt>Chain</dt><dd>Robinhood</dd></div></dl></div>
    <div className="t-price-chart" aria-label="Price chart placeholder"><div><Icon name="chart" size={24} /><p>[PLACEHOLDER] Price history</p><span>Baum market data will appear here when available.</span></div></div>
  </div><aside className="t-feature-card t-side-panel" aria-label="Swap"><div className="t-segments t-swap-sides" role="group" aria-label="Buy or sell"><button type="button" aria-pressed={buying} onClick={() => flip('buy')}>Buy</button><button type="button" aria-pressed={!buying} onClick={() => flip('sell')}>Sell</button></div>
    <div className="t-swap-input"><label htmlFor="swap-amount">You pay</label><div className="t-swap-input-row"><input id="swap-amount" type="text" inputMode="decimal" placeholder="0.0" value={input} onChange={(event) => { setInput(event.target.value); setTrade({ step: 'idle' }) }} aria-invalid={invalid} aria-describedby={invalid ? 'swap-amount-error' : 'swap-note'} /><TokenName token={from} /></div>{priced?.usdIn != null && <p className="t-placeholder">≈ {money(priced.usdIn)}</p>}</div>
    <div className="t-swap-flip"><IconButton icon="counter" label="Flip tokens" variant="outline" onClick={() => flip(buying ? 'sell' : 'buy')} /></div>
    <div className="t-swap-input"><span className="t-fine">You get{priced && !priced.exact ? ' (estimate)' : ''}</span><div className="t-swap-input-row">{priced ? <span className="t-swap-out">{priced.exact ? '' : '≈ '}{amount(priced.amountOut)}</span> : <span className="t-muted">—</span>}<TokenName token={to} /></div>
      <p className="t-placeholder">{priced ? (priced.usdOut != null ? `≈ ${money(priced.usdOut)}` : '') : status}</p></div>
    <div className="t-fee-presets" role="group" aria-label="Amount presets">{presets.map((value) => <button type="button" className="t-chip" key={value} aria-pressed={input === value} onClick={() => { setInput(value); setTrade({ step: 'idle' }) }}>{Number(value) < 1 ? value : count(Number(value))}</button>)}<button type="button" className="t-chip" disabled title="Balance is available on Baum">Max</button></div>
    {invalid && <p id="swap-amount-error" className="t-negative t-fine">Enter an amount greater than zero.</p>}
    <div><span className="t-fine">{buying ? 'Pay with' : 'Receive'}</span><div className="t-filters t-token-chips" role="group" aria-label={buying ? 'Pay with' : 'Receive'}>{others.map((t) => <button type="button" className="t-chip" key={t.symbol} aria-pressed={t.symbol === other.symbol} onClick={() => { setOther(t); setInput(''); setTrade({ step: 'idle' }) }}><TokenLogo token={t} />{t.symbol}</button>)}</div></div>
    <div className="t-summary-box">
      {priced ? <>
        <div className="t-key-value"><span>Rate</span><strong>{rate(from, to, priced.amountIn, priced.amountOut)}</strong></div>
        <div className="t-key-value"><span>Price impact</span><strong className={priced.impactPct >= 5 ? 't-negative' : ''}>{priced.impactPct < 0.01 ? '<0.01' : priced.impactPct.toFixed(2)}%</strong></div>
        <div className="t-key-value"><span>Curve fee</span><strong>{priced.curveFeePct}%, included</strong></div>
        <div className="t-key-value" title={`Baum's swap fee depends on your Deed Deck: holders pay ${BAUM_FEE_BPS.holder / 100}%, gifted Deed Decks ${BAUM_FEE_BPS.gifted / 100}%, everyone else ${BAUM_FEE_BPS.none / 100}%.`}><span>Baum fee</span><strong>{BAUM_FEE_BPS.holder / 100}–{BAUM_FEE_BPS.none / 100}%, by Deed Deck</strong></div>
        <div className="t-key-value"><span>Minimum received</span><strong>{amount(priced.minOut)} {to.symbol}</strong></div>
        <div className="t-key-value"><span>Route</span><strong>{priced.route.join(' → ')}{priced.exact ? ' · Pons curve' : ` · ${other.symbol} leg at market`}</strong></div>
      </> : <div className="t-key-value"><span>Route</span><strong>Pons curve, via Baum</strong></div>}
      <div className="t-key-value"><span>Network</span><strong>{CHAIN.name}</strong></div>
    </div>
    {here && !invalid
      ? trade.step === 'confirm' && trade.quote
        ? <div className="t-content-stack">
            <div className="t-summary-box">
              <div className="t-key-value"><span>Baum’s quote</span><strong>{amount(Number(trade.quote.toAmount))} {TOKEN.symbol}</strong></div>
              <div className="t-key-value"><span>Minimum received</span><strong>{amount(Number(trade.quote.minReceived))} {TOKEN.symbol}</strong></div>
              <div className="t-key-value"><span>Fees</span><strong>{trade.quote.venue === 'curve' ? `Curve ${trade.quote.venueFeePct ?? 0}%, included` : `Baum ${trade.quote.feePct}%${trade.quote.partnerFeePct ? ` · ${TOKEN.symbol} ${trade.quote.partnerFeePct}%` : ''}`}</strong></div>
            </div>
            <button type="button" className="t-submit" onClick={send}><Icon name="wallet" />Confirm in wallet</button>
            <button type="button" className="t-chip" onClick={() => setTrade({ step: 'idle' })}>Cancel</button>
          </div>
        : trade.step === 'done' && trade.hash
          ? <Callout>Swap sent. <a href={txUrl(trade.hash)} target="_blank" rel="noreferrer">See it on the explorer ↗</a></Callout>
          : <button type="button" className="t-submit" onClick={askBaum} disabled={trade.step === 'quoting' || trade.step === 'sending'}><Icon name="wallet" />{trade.step === 'quoting' ? 'Getting Baum’s quote…' : trade.step === 'sending' ? 'Confirm in your wallet…' : `Buy ${TOKEN.symbol}`}</button>
      : <a className="t-submit" href={buyUrl()} target="_blank" rel="noreferrer"><Icon name="arrow" />{priced ? `${buying ? 'Buy' : 'Sell'} ${TOKEN.symbol} on Baum` : `Trade ${TOKEN.symbol} on Baum`}</a>}
    {trade.error && <Callout error>{trade.error}</Callout>}
    <p className="t-fine" id="swap-note">
      {priced ? `${priced.exact ? 'Exact off the curve as of the last read.' : `The ${other.symbol} leg is priced at market, so this is an estimate.`} Minimum received allows for the full 1% Baum fee and ${SLIPPAGE_BPS / 100}% slippage.${ago != null ? ` Updated ${ago < 2 ? 'just now' : `${ago}s ago`}.` : ''} ` : ''}
      {here ? 'Baum prices it for your wallet and you sign it there; nothing moves until you confirm.' : 'The trade happens on Baum, which quotes it again before anything is sent.'} You can also use <a href={baumLinks.ref()} target="_blank" rel="noreferrer">Baum on Telegram ↗</a>.
    </p>
  </aside></div>
}
