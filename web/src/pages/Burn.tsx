import { useState } from 'react'
import { ACCESS, BURN_TO_ENTER } from '../config'
import { burnTokens, connect, hasWallet, txUrl } from '../lib/wallet'
import { tokens } from '../components/ui'

type Choice = (typeof BURN_TO_ENTER)[number]

// Skip the invite line: burn SLUGS or BAUM from a wallet, then link that wallet
// to the Baum account. Baum reads the linked wallet's burns and lets them in.
export default function Burn() {
  const [choice, setChoice] = useState<Choice>(BURN_TO_ENTER[0])
  const [account, setAccount] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hash, setHash] = useState<string | null>(null)

  async function run() {
    setError(null)
    setBusy(true)
    try {
      const from = account ?? (await connect())
      setAccount(from)
      setHash(await burnTokens(from, choice.address, choice.symbol, choice.amount))
    } catch (err) {
      setError((err as { message?: string }).message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ maxWidth: 640 }}>
      <div className="eyebrow">Invite only</div>
      <h1 style={{ marginTop: 8 }}>Skip the line</h1>
      <p>
        No referral? Burn {BURN_TO_ENTER.map((b) => `${tokens(b.amount)} ${b.symbol}`).join(' or ')} from your own wallet,
        then link that wallet to your Baum account. Baum lets you in as soon as it sees the burn. Burns you've already
        made from that wallet count too.
      </p>

      <div className="card" style={{ display: 'grid', gap: 16 }}>
        <div>
          <label>Burn</label>
          <div className="chips" role="tablist">
            {BURN_TO_ENTER.map((b) => (
              <button
                key={b.symbol}
                role="tab"
                aria-selected={b.symbol === choice.symbol}
                className={`chip${b.symbol === choice.symbol ? ' on' : ''}`}
                onClick={() => { setChoice(b); setHash(null) }}
              >
                {tokens(b.amount)} {b.symbol}
              </button>
            ))}
          </div>
        </div>

        <p className="note" style={{ margin: 0 }}>
          Sent to the dead address on Robinhood Chain. A burn can't be undone. Send it from a wallet you can link
          (MetaMask, Rabby, Coinbase Wallet), not an exchange.
        </p>

        {!hasWallet() ? (
          <p className="callout" style={{ margin: 0 }}>No browser wallet found. Open this page in your wallet's browser, or install MetaMask or Rabby.</p>
        ) : (
          <div className="row">
            <button className="btn primary" onClick={run} disabled={busy}>
              {busy ? 'Confirm in your wallet…' : `${account ? '' : 'Connect and '}burn ${tokens(choice.amount)} ${choice.symbol}`}
            </button>
            {account && <span className="note num">{account.slice(0, 6)}…{account.slice(-4)}</span>}
          </div>
        )}

        {error && <p className="down" style={{ margin: 0 }}>{error}</p>}

        {hash && (
          <div className="callout" style={{ margin: 0 }}>
            Burned. <a href={txUrl(hash)} target="_blank" rel="noreferrer">View the transaction ↗</a>
            <br />
            Now link this wallet to your Baum account, then say hi to Baum in Telegram.
          </div>
        )}

        <div className="row">
          <a className={`btn${hash ? ' primary' : ''}`} href={ACCESS.linkWallet} target="_blank" rel="noreferrer">Link your wallet on Baum ↗</a>
        </div>
      </div>
    </section>
  )
}
