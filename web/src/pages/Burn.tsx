import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ACCESS, BURN_TO_ENTER, CHAIN } from '../config'
import Icon from '../components/terminal/Icon'
import { Callout, FloatingCard, IconLink } from '../components/terminal/ui'
import { count } from '../lib/terminal-format'
import { shortAddress } from '../lib/terminal-model'
import { DEAD, burnTokens, connect, hasWallet, txUrl } from '../lib/wallet'

type Choice = (typeof BURN_TO_ENTER)[number]

export default function Burn() {
  const [choice, setChoice] = useState<Choice>(BURN_TO_ENTER[0])
  const [account, setAccount] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hash, setHash] = useState('')
  async function burn() {
    setConfirm(false); setError(''); setBusy(true); setHash('')
    try { const from = await connect(); setAccount(from); setHash(await burnTokens(from, choice.address, choice.symbol, choice.amount)) }
    catch (err) { setError((err as { code?: number }).code === 4001 ? 'You cancelled the wallet request. No burn was submitted.' : (err as Error).message) }
    finally { setBusy(false) }
  }
  function preview() {
    setError('')
    if (!hasWallet()) setError('No wallet found in this browser. Open this page in your wallet’s browser, or install MetaMask or Rabby.')
    else setConfirm(true)
  }
  return <div className="t-burn-page"><aside className="t-token-banner" aria-label="Token"><span><span className="t-dot t-dot--online" />TOKEN LIVE <span className="t-banner-chain">Now on {CHAIN.name}</span></span><Link to="/token">View token ↗</Link></aside>
    <main className="t-burn-main"><Link to="/" className="t-burn-logo" aria-label="SLUGS invite page"><img src={`${import.meta.env.BASE_URL}slugs-logo-orange.png`} alt="SLUGS" /></Link>
      <section className="t-burn-card"><div><span className="t-burn-eyebrow">INVITE ONLY</span><h1>Skip the line</h1><p>No referral? Burn from your own wallet, then link that wallet on Baum. Baum lets you in as soon as it sees the burn. Burns you already made from that wallet count too.</p></div>
        <div className="t-burn-step"><span className="t-step-number">1</span><div className="t-content-stack"><h2>Burn</h2><div className="t-burn-choices" role="group" aria-label="What to burn">{BURN_TO_ENTER.map((token) => <button type="button" key={token.symbol} aria-pressed={choice.symbol === token.symbol} disabled={busy} onClick={() => { setChoice(token); setHash(''); setError('') }}><strong>{count(token.amount)}</strong><span>{token.symbol}</span></button>)}</div>
          <p className="t-fine">Sent to the dead address on {CHAIN.name} and can’t be undone. Use a wallet you can link (MetaMask, Rabby, Coinbase Wallet), not an exchange.</p>
          <button type="button" className="t-submit" disabled={busy} aria-busy={busy} onClick={preview}><Icon name="flame" />{busy ? 'Confirming in your wallet…' : `${account ? '' : 'Connect and '}burn ${count(choice.amount)} ${choice.symbol}`}</button>
          {account && <span className="t-fine">Wallet: {shortAddress(account)}</span>}
          {error && <Callout error onRetry={preview}>{error}</Callout>}
          {hash && <Callout>Transaction submitted. <a href={txUrl(hash)} target="_blank" rel="noreferrer">Check its status on the explorer ↗</a>, then link this wallet on Baum.</Callout>}
        </div></div>
        <div className="t-burn-step t-burn-step--second"><span className="t-step-number">2</span><div><h2>Link that wallet on Baum</h2><p className="t-fine">Baum checks the burns on your linked wallet.</p></div><IconLink icon="arrow" label="Link your wallet on Baum" href={ACCESS.linkWallet} variant="outline" /></div>
      </section><p className="t-fine">Have an invite code? <Link to="/">Enter it instead</Link></p>
    </main>
    {confirm && <FloatingCard title="Confirm access burn" onClose={() => setConfirm(false)}><p>Burn <strong>{count(choice.amount)} {choice.symbol}</strong> from your wallet on {CHAIN.name} to skip the invite line.</p><div className="t-summary-box"><div className="t-key-value"><span>Token</span><strong>{choice.symbol}</strong></div><p className="t-confirm-address">{choice.address}</p></div><p className="t-fine">Tokens go to {DEAD} and cannot be recovered. Link this same wallet to Baum afterward. Your wallet will ask you to confirm.</p><button type="button" className="t-submit" onClick={burn}>Confirm burn in wallet</button></FloatingCard>}
  </div>
}
