import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ACCESS, BURN_TO_ENTER, CHAIN } from '../config'
import Icon from '../components/terminal/Icon'
import WalletPanel from '../components/terminal/WalletPanel'
import { Callout, FloatingCard, IconLink } from '../components/terminal/ui'
import { count } from '../lib/terminal-format'
import { useWallet } from '../lib/use-wallet'
import { DEAD, burnTokens, chainBalance, ensureAllowance, sendBuilt, txUrl } from '../lib/wallet'

const PAY = [{ symbol: 'ETH', decimals: 18 }, { symbol: 'USDG', decimals: 6 }, { symbol: 'USDX', decimals: 6 }] as const
type Pay = (typeof PAY)[number]['symbol']

// What api/burn-buy.js passes back from Baum (baum-monorepo app/api/partner/swap).
type BuyQuote = {
  fromSymbol: string
  fromAmount: string
  toAmount: string
  minReceived: string
  feePct: number
  feeAmount: string
  partnerFeePct?: number
  partnerFeeAmount?: string
  totalFeePct?: number
  venueFeePct: number | null
  approval: { token: string; spender: string } | null
  transaction: { to: string; data: string; value: string; chainId: number }
}

const cancelled = (err: unknown) => (err as { code?: number }).code === 4001
const units = (raw: string, decimals: number) => Number(raw) / 10 ** decimals
const shown = (n: number) => n >= 1 ? n.toLocaleString('en-US', { maximumFractionDigits: 4 }) : n.toPrecision(4).replace(/\.?0+$/, '')

export default function Burn() {
  const choice = BURN_TO_ENTER
  const wallet = useWallet()
  const need = BigInt(choice.amount) * 10n ** 18n
  const [balance, setBalance] = useState<bigint | null>(null)
  const [mode, setMode] = useState<'burn' | 'buy' | null>(null)
  const [pay, setPay] = useState<Pay>('ETH')
  const [quote, setQuote] = useState<BuyQuote | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const [hash, setHash] = useState('')
  const [bought, setBought] = useState('')

  async function readBalance() {
    if (!wallet.account) return setBalance(null)
    setBalance(await chainBalance(wallet.account, choice.address).catch(() => null))
  }
  useEffect(() => { readBalance() }, [wallet.account]) // eslint-disable-line react-hooks/exhaustive-deps
  const enough = balance !== null && balance >= need
  const shownMode = mode ?? (balance === null || enough ? 'burn' : 'buy')

  async function burn() {
    setConfirm(false); setError(''); setHash(''); setStep(`Burning ${count(choice.amount)} ${choice.symbol}…`)
    try { setHash(await burnTokens(wallet.account, choice.address, choice.symbol, choice.amount)) }
    catch (err) { setError(cancelled(err) ? 'You cancelled the wallet request. No burn was submitted.' : (err as Error).message) }
    finally { setStep(''); readBalance() }
  }

  async function askBaum() {
    setError(''); setQuote(null); setStep('Asking Baum for a price…')
    try {
      const res = await fetch('/api/burn-buy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payWith: pay, address: wallet.account }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof body.reason === 'string' ? body.reason : 'Baum couldn’t price that just now.')
      setQuote(body as BuyQuote); setConfirm(true)
    } catch (err) { setError((err as Error).message) }
    finally { setStep('') }
  }

  async function buyAndBurn() {
    if (!quote) return
    setConfirm(false); setError(''); setHash(''); setBought('')
    const steps = quote.approval ? 3 : 2
    let n = 1
    try {
      if (quote.approval) {
        setStep(`1/${steps} Approving ${quote.fromSymbol} in your wallet…`)
        await ensureAllowance(wallet.account, quote.approval.token, quote.approval.spender, BigInt(quote.fromAmount))
        n++
      }
      setStep(`${n}/${steps} Buying ${choice.symbol}…`)
      setBought(await sendBuilt(wallet.account, quote.transaction))
      n++
      setStep(`${n}/${steps} Burning ${count(choice.amount)} ${choice.symbol}…`)
      setHash(await burnTokens(wallet.account, choice.address, choice.symbol, choice.amount))
    } catch (err) {
      const what = cancelled(err) ? 'You cancelled in your wallet.' : (err as Error).message
      // Bought but not burned: the SLUGS are in the wallet, so the burn is one tap away.
      setError(n === steps ? `${what} Your ${choice.symbol} is in your wallet. Burn it below when you’re ready.` : `${what} Nothing was bought.`)
      if (n === steps) setMode('burn')
    } finally { setStep(''); setQuote(null); readBalance() }
  }

  const payDecimals = PAY.find((p) => p.symbol === quote?.fromSymbol)?.decimals ?? 18
  const spend = quote ? units(quote.fromAmount, payDecimals) : 0
  const extra = quote ? Number(quote.toAmount) - choice.amount : 0
  return <div className="t-burn-page"><aside className="t-token-banner" aria-label="Token"><span><span className="t-dot t-dot--online" />TOKEN LIVE <span className="t-banner-chain">Now on {CHAIN.name}</span></span><Link to="/token">View token ↗</Link></aside>
    <main className="t-burn-main"><Link to="/" className="t-burn-logo" aria-label="SLUGS invite page"><img src={`${import.meta.env.BASE_URL}slugs-logo-orange.png`} alt="SLUGS" /></Link>
      <section className="t-burn-card"><div><span className="t-burn-eyebrow">INVITE ONLY</span><h1>Skip the line</h1><p>No referral? Burn from your own wallet, then link that wallet on Baum. Baum lets you in as soon as it sees the burn. Burns you already made from that wallet count too.</p></div>
        <div className="t-burn-step"><span className="t-step-number">1</span><div className="t-content-stack"><h2>Burn</h2><div className="t-burn-amount"><strong>{count(choice.amount)}</strong><span>{choice.symbol}</span></div>
          <p className="t-fine">Sent to the dead address on {CHAIN.name} and can’t be undone. Use a wallet you can link (MetaMask, Rabby, Coinbase Wallet), not an exchange.</p>
          <WalletPanel wallet={wallet} balance={balance === null ? undefined : `${count(Number(balance / 10n ** 18n))} ${choice.symbol}`} />
          {wallet.account && <>
            <div className="t-segments" role="group" aria-label="How to burn"><button type="button" aria-pressed={shownMode === 'burn'} onClick={() => setMode('burn')}>Burn {choice.symbol} I have</button><button type="button" aria-pressed={shownMode === 'buy'} onClick={() => setMode('buy')}>Buy {choice.symbol} and burn</button></div>
            {shownMode === 'burn' ? <>
              {balance !== null && !enough && <p className="t-fine">This wallet holds less than {count(choice.amount)} {choice.symbol}. <button type="button" className="t-link-button" onClick={() => setMode('buy')}>Buy it with ETH, USDG or USDX</button></p>}
              <button type="button" className="t-submit" disabled={Boolean(step) || !wallet.onChain || (balance !== null && !enough)} aria-busy={Boolean(step)} onClick={() => { setError(''); setConfirm(true) }}><Icon name="flame" />{step || `Burn ${count(choice.amount)} ${choice.symbol}`}</button>
            </> : <>
              <div><span className="t-fine">Pay with</span><div className="t-filters t-token-chips" role="group" aria-label="Pay with">{PAY.map((p) => <button type="button" className="t-chip" key={p.symbol} aria-pressed={pay === p.symbol} onClick={() => setPay(p.symbol)}>{p.symbol}</button>)}</div></div>
              <p className="t-fine">Baum buys about 3,300,000 {choice.symbol} so slippage can’t leave you short, burns {count(choice.amount)}, and the rest stays in your wallet. One fee of 1%.</p>
              <button type="button" className="t-submit" disabled={Boolean(step) || !wallet.onChain} aria-busy={Boolean(step)} onClick={askBaum}><Icon name="flame" />{step || `Buy with ${pay} and burn`}</button>
            </>}
          </>}
          {error && <Callout error>{error}</Callout>}
          {bought && !hash && !step && <Callout>Bought. <a href={txUrl(bought)} target="_blank" rel="noreferrer">See the buy ↗</a></Callout>}
          {hash && <Callout>Burn submitted. <a href={txUrl(hash)} target="_blank" rel="noreferrer">Check its status on the explorer ↗</a>, then link this wallet on Baum.</Callout>}
        </div></div>
        <div className="t-burn-step t-burn-step--second"><span className="t-step-number">2</span><div><h2>Link that wallet on Baum</h2><p className="t-fine">Baum checks the burns on your linked wallet.</p></div><IconLink icon="arrow" label="Link your wallet on Baum" href={ACCESS.linkWallet} variant="outline" /></div>
      </section><p className="t-fine">Have an invite code? <Link to="/">Enter it instead</Link></p>
    </main>
    {confirm && !quote && <FloatingCard title="Confirm access burn" onClose={() => setConfirm(false)}><p>Burn <strong>{count(choice.amount)} {choice.symbol}</strong> from {wallet.account.slice(0, 6)}…{wallet.account.slice(-4)} on {CHAIN.name} to skip the invite line.</p><div className="t-summary-box"><div className="t-key-value"><span>Token</span><strong>{choice.symbol}</strong></div><p className="t-confirm-address">{choice.address}</p></div><p className="t-fine">Tokens go to {DEAD} and cannot be recovered. Link this same wallet to Baum afterward. Your wallet will ask you to confirm.</p><button type="button" className="t-submit" onClick={burn}>Confirm burn in wallet</button></FloatingCard>}
    {confirm && quote && <FloatingCard title="Buy and burn" onClose={() => { setConfirm(false); setQuote(null) }}>
      <div className="t-summary-box">
        <div className="t-key-value"><span>You pay</span><strong>{shown(spend)} {quote.fromSymbol}</strong></div>
        <div className="t-key-value"><span>You get</span><strong>≈ {count(Math.floor(Number(quote.toAmount)))} {choice.symbol}</strong></div>
        <div className="t-key-value"><span>Burned</span><strong>{count(choice.amount)} {choice.symbol}</strong></div>
        <div className="t-key-value"><span>Left in your wallet</span><strong>≈ {count(Math.max(0, Math.floor(extra)))} {choice.symbol}</strong></div>
        <div className="t-key-value"><span>Fee</span><strong>{quote.totalFeePct ?? quote.feePct + (quote.partnerFeePct ?? 0)}% · {shown(Number(quote.feeAmount) + Number(quote.partnerFeeAmount ?? 0))} {quote.fromSymbol}</strong></div>
        {quote.venueFeePct !== null && <div className="t-key-value"><span>Curve fee</span><strong>{quote.venueFeePct}%, in the price</strong></div>}
        <div className="t-key-value"><span>Least you’ll get</span><strong>{count(Math.floor(Number(quote.minReceived)))} {choice.symbol}</strong></div>
      </div>
      <p className="t-fine">Your wallet asks {quote.approval ? `three times: approve ${quote.fromSymbol}, buy, then burn` : 'twice: buy, then burn'}. Burned tokens go to {DEAD} and cannot be recovered.</p>
      <button type="button" className="t-submit" onClick={buyAndBurn}><Icon name="flame" />Buy and burn</button>
    </FloatingCard>}
  </div>
}
