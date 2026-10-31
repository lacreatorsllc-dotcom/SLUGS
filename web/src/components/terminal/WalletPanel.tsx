import { useState } from 'react'
import { CHAIN } from '../../config'
import { shortAddress } from '../../lib/terminal-model'
import type { useWallet } from '../../lib/use-wallet'
import { walletAppLinks } from '../../lib/wallet'
import Icon from './Icon'
import { Callout, CopyButton, FloatingCard } from './ui'

type Wallet = ReturnType<typeof useWallet>

/** The installed wallets to pick from, or how to get one when there are none. */
function WalletPicker({ wallet, onClose }: { wallet: Wallet; onClose: () => void }) {
  return <FloatingCard title="Connect a wallet" onClose={onClose}>
    {wallet.options.length ? <div className="t-wallet-options">
      {wallet.options.map((option) => <button type="button" key={option.id} className="t-wallet-option" disabled={wallet.busy} onClick={async () => { onClose(); await wallet.connect(option.id) }}>
        {option.icon ? <img src={option.icon} alt="" width={24} height={24} /> : <Icon name="wallet" size={20} />}<span>{option.name}</span>{wallet.wallet?.id === option.id && <span className="t-fine">Last used</span>}
      </button>)}
    </div> : <>
      <p>No wallet found in this browser.</p>
      <p className="t-fine">On a phone, open this page in your wallet app:</p>
      <div className="t-wallet-options">{walletAppLinks().map((link) => <a key={link.name} className="t-wallet-option" href={link.href}><Icon name="arrow" /><span>Open in {link.name}</span></a>)}</div>
      <p className="t-fine">On a computer, install <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">MetaMask</a> or <a href="https://rabby.io/" target="_blank" rel="noreferrer">Rabby</a>, then reload.</p>
    </>}
  </FloatingCard>
}

/** Connect, see, change and disconnect the browser wallet a page sends from. */
export default function WalletPanel({ wallet, balance }: { wallet: Wallet; balance?: React.ReactNode }) {
  const [picking, setPicking] = useState(false)
  const pick = () => wallet.options.length === 1 ? wallet.connect(wallet.options[0].id) : setPicking(true)
  return <div className="t-wallet-box">
    {wallet.account ? <>
      <div className="t-wallet-row">
        {wallet.wallet?.icon ? <img src={wallet.wallet.icon} alt="" width={20} height={20} /> : <Icon name="wallet" />}
        <div className="t-wallet-who"><strong>{shortAddress(wallet.account)}</strong><span className="t-fine">{wallet.wallet?.name ?? 'Browser wallet'}{wallet.onChain ? ` · ${CHAIN.name}` : ''}</span></div>
        <CopyButton value={wallet.account} />
      </div>
      {balance && <div className="t-key-value"><span>Balance</span><strong>{balance}</strong></div>}
      {wallet.chain !== null && !wallet.onChain && <Callout error>Your wallet is on another network. <button type="button" className="t-link-button" onClick={wallet.switchChain}>Switch to {CHAIN.name}</button></Callout>}
      <div className="t-wallet-actions">
        <button type="button" className="t-chip" disabled={wallet.busy} onClick={wallet.chooseAccount}>Use another address</button>
        {wallet.options.length > 1 && <button type="button" className="t-chip" disabled={wallet.busy} onClick={() => setPicking(true)}>Change wallet</button>}
        <button type="button" className="t-chip" disabled={wallet.busy} onClick={wallet.disconnect}><Icon name="signout" />Disconnect</button>
      </div>
    </> : <button type="button" className="t-submit t-submit--secondary" disabled={wallet.busy} aria-busy={wallet.busy} onClick={pick}><Icon name="wallet" />{wallet.busy ? 'Waiting for your wallet…' : 'Connect wallet'}</button>}
    {wallet.error && <Callout error>{wallet.error}</Callout>}
    {picking && <WalletPicker wallet={wallet} onClose={() => setPicking(false)} />}
  </div>
}
