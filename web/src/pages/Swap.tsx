import { useState } from 'react'
import { FEES, TOKEN } from '../config'
import { baumLinks, buyUrl } from '../lib/baum'

const ASSETS = [TOKEN.symbol, 'BAUM', 'ETH', 'USDC']

export default function Swap() {
  const [from, setFrom] = useState('ETH')
  const [to, setTo] = useState(TOKEN.symbol)
  const [amount, setAmount] = useState('')
  return (
    <div style={{ maxWidth: 460 }}>
      <h1 style={{ fontSize: 36 }}>Swap</h1>
      <p>Trade {TOKEN.symbol}, BAUM and ETH. Routed through Baum's swap infrastructure, plus a {FEES.swapBps} bps platform fee.</p>
      <div className="card">
        <div className="field">
          <label>From</label>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
            <select value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 120 }}>
              {ASSETS.filter((a) => a !== to).map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>To</label>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {ASSETS.filter((a) => a !== from).map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        {TOKEN.address ? (
          <a className="btn primary" style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center' }} href={buyUrl()} target="_blank" rel="noreferrer">Trade {TOKEN.symbol} on Baum</a>
        ) : (
          <button className="btn primary" style={{ width: '100%' }} disabled>Connect wallet (coming soon)</button>
        )}
        <p className="note" style={{ marginTop: 12, marginBottom: 0 }}>
          The in-page swap is waiting on Baum's partner swap API. Until then, trade on Baum's site or in{' '}
          <a href={baumLinks.ref()} target="_blank" rel="noreferrer">Baum on Telegram</a>.
        </p>
      </div>
    </div>
  )
}
