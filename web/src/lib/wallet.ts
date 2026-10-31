import { CHAIN, FEES, TOKEN } from '../config'

// The browser wallet (MetaMask, Rabby, Coinbase…), spoken to directly over EIP-1193
// so the site needs no wallet library for the one transaction it sends.

type Eip1193 = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
  on?(event: string, listener: (value: unknown) => void): void
  removeListener?(event: string, listener: (value: unknown) => void): void
}
export type WalletOption = { id: string; name: string; icon?: string }

// Wallets announce themselves over EIP-6963, so with several installed the person
// picks one instead of whichever grabbed window.ethereum last. The pick is kept
// in localStorage so a reload reconnects to it without asking again.
const STORE = 'slugs.wallet'
const injected = () => (window as unknown as { ethereum?: Eip1193 }).ethereum
const announced = new Map<string, { option: WalletOption; provider: Eip1193 }>()
const listeners = new Set<() => void>()
let chosen: string | null = null

const remembered = () => { try { return localStorage.getItem(STORE) } catch { return null } }
function remember(id: string | null) {
  try { if (id) localStorage.setItem(STORE, id); else localStorage.removeItem(STORE) } catch { /* storage blocked: it lasts this visit only */ }
}

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event) => {
    const { info, provider } = (event as CustomEvent<{ info: { rdns: string; name: string; icon?: string }; provider: Eip1193 }>).detail
    if (!info?.rdns || announced.has(info.rdns)) return
    announced.set(info.rdns, { option: { id: info.rdns, name: info.name, icon: info.icon }, provider })
    listeners.forEach((fn) => fn())
  })
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

/** Installed wallets, falling back to the one on window.ethereum for wallets that don't announce. */
export function wallets(): WalletOption[] {
  if (announced.size) return [...announced.values()].map((w) => w.option)
  return injected() ? [{ id: 'injected', name: 'Browser wallet' }] : []
}
export function onWallets(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

const providerFor = (id: string | null) => (id && announced.get(id)?.provider) || (id === 'injected' || !announced.size ? injected() : undefined)
const provider = () => providerFor(chosen ?? remembered()) ?? injected() ?? [...announced.values()][0]?.provider
/** The wallet in use: the one picked, else the one remembered from last visit. */
export const currentWallet = () => wallets().find((w) => w.id === (chosen ?? remembered())) ?? (wallets().length === 1 ? wallets()[0] : undefined)

export const hasWallet = () => Boolean(provider())

/** Links that open this page inside a phone wallet's browser, for phones with no wallet in the page. */
export function walletAppLinks(href = window.location.href) {
  const url = new URL(href)
  return [
    { name: 'MetaMask', href: `https://metamask.app.link/dapp/${url.host}${url.pathname}${url.search}` },
    { name: 'Coinbase Wallet', href: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url.href)}` },
  ]
}

export const DEAD = '0x000000000000000000000000000000000000dEaD'
// A boost is the token's own burn(uint256) (Pons's burn: it destroys the caller's
// balance and lowers totalSupply) with "ATPB" and the agent's wallet appended to the
// calldata. The token ignores trailing calldata; the Agent Trading Platform's Pages
// job (scripts/fetch-token.mjs) reads it back to credit the boost.
const BOOST_TAG = '41545042'
const BURN = '0x42966c68'

const pad = (hex: string) => hex.replace(/^0x/, '').padStart(64, '0')
const chainHex = '0x' + CHAIN.id.toString(16)

async function request<T>(method: string, params?: unknown[]): Promise<T> {
  const eth = provider()
  if (!eth) throw new Error('No wallet found. Install MetaMask or Rabby, or open this page in your wallet\'s browser.')
  return (await eth.request({ method, params })) as T
}

async function switchChain() {
  try {
    await request('wallet_switchEthereumChain', [{ chainId: chainHex }])
  } catch (err) {
    // 4902: the wallet doesn't know the chain yet.
    if ((err as { code?: number }).code !== 4902) throw err
    await request('wallet_addEthereumChain', [{
      chainId: chainHex,
      chainName: CHAIN.name,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: [CHAIN.rpc],
      blockExplorerUrls: [CHAIN.explorer],
    }])
  }
}

/** Asks the wallet (`id`, else the one in use) for an account and moves it to CHAIN. */
export async function connect(id?: string): Promise<string> {
  if (id) chosen = id
  const [account] = await request<string[]>('eth_requestAccounts')
  remember(chosen ?? currentWallet()?.id ?? null)
  await switchChain()
  return account
}

/** The account a remembered wallet already allows this site, without a prompt; '' if none. */
export async function reconnect(): Promise<string> {
  const id = remembered()
  if (!id || !providerFor(id)) return ''
  chosen = id
  try { return (await request<string[]>('eth_accounts'))[0] ?? '' } catch { return '' }
}

/** Opens the wallet's own account picker, for a different address in the same wallet. */
export async function chooseAccount(): Promise<string> {
  await request('wallet_requestPermissions', [{ eth_accounts: {} }])
  const [account] = await request<string[]>('eth_accounts')
  return account ?? ''
}

/**
 * Forgets the wallet here and, where the wallet supports it (MetaMask and others),
 * drops this site's access too, so the next connect asks again.
 */
export async function disconnect() {
  try { await request('wallet_revokePermissions', [{ eth_accounts: {} }]) } catch { /* older wallets: forgetting it here is enough */ }
  chosen = null
  remember(null)
}

export const chainId = async () => Number(BigInt(await request<string>('eth_chainId')))
export const switchToChain = switchChain

/** Calls back on account or network changes in the wallet in use; returns the unsubscribe. */
export function watchWallet(onAccount: (account: string) => void, onChainId: (id: number) => void) {
  const eth = provider()
  const accounts = (value: unknown) => onAccount((value as string[])[0] ?? '')
  const chain = (value: unknown) => onChainId(Number(BigInt(value as string)))
  eth?.on?.('accountsChanged', accounts)
  eth?.on?.('chainChanged', chain)
  return () => { eth?.removeListener?.('accountsChanged', accounts); eth?.removeListener?.('chainChanged', chain) }
}

/** A token balance read from CHAIN's public RPC, so it's right whatever network the wallet is on. */
export async function chainBalance(account: string, token: string): Promise<bigint> {
  const res = await fetch(CHAIN.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: token, data: '0x70a08231' + pad(account) }, 'latest'] }) })
  const body = await res.json() as { result?: string; error?: { message: string } }
  if (!body.result) throw new Error(body.error?.message ?? 'Balance unavailable')
  return BigInt(body.result)
}

// Checked again right before every send: the wallet can change networks after
// connecting, and the same transaction on another chain burns nothing we can see.
async function onChain() {
  const current = async () => BigInt(await request<string>('eth_chainId'))
  if ((await current()) === BigInt(CHAIN.id)) return
  await switchChain()
  if ((await current()) !== BigInt(CHAIN.id)) throw new Error(`Switch your wallet to ${CHAIN.name} and try again. Nothing was sent.`)
}

const call = (token: string, data: string) => request<string>('eth_call', [{ to: token, data }, 'latest']).then(BigInt)
const tokenCall = (data: string) => call(TOKEN.address, data)

export async function boostCost(hours: number) {
  const decimals = await tokenCall('0x313ce567')
  return BigInt(FEES.boostPerHour * hours) * 10n ** decimals
}

export const tokenBalance = (account: string, token = TOKEN.address) => call(token, '0x70a08231' + pad(account))

// Sends `data` to `token` once the wallet is on CHAIN and holds `amount`, and
// resolves with the transaction hash once it's mined.
async function send(account: string, token: string, symbol: string, amount: bigint, data: string): Promise<string> {
  await onChain()
  if ((await tokenBalance(account, token)) < amount) throw new Error(`Not enough ${symbol} in ${account.slice(0, 6)}…${account.slice(-4)}.`)
  const hash = await request<string>('eth_sendTransaction', [{ from: account, to: token, data }])
  for (let i = 0; i < 90; i++) {
    const receipt = await request<{ status: string } | null>('eth_getTransactionReceipt', [hash])
    if (receipt) {
      if (receipt.status !== '0x1') throw new Error('The burn transaction failed on-chain.')
      return hash
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  return hash // still pending; the explorer link will show it
}

/**
 * Sends a transaction Baum built (a swap), from the connected wallet on Robinhood
 * Chain, and resolves with its hash once it's mined, or still pending after 3 minutes.
 * The chain is checked first so a wallet left on another network isn't asked to sign there.
 */
export async function sendBuilt(account: string, tx: { to: string; data: string; value: string; chainId: number }): Promise<string> {
  if (tx.chainId !== CHAIN.id) throw new Error('That trade is for another network.')
  await onChain()
  const hash = await request<string>('eth_sendTransaction', [{ from: account, to: tx.to, data: tx.data, value: tx.value }])
  for (let i = 0; i < 90; i++) {
    const receipt = await request<{ status: string } | null>('eth_getTransactionReceipt', [hash])
    if (receipt) {
      if (receipt.status !== '0x1') throw new Error('The swap failed on-chain. Nothing was spent but gas.')
      return hash
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  return hash
}

/**
 * Approves `spender` for `amount` of `token` when the allowance is short, and
 * resolves once the approval is mined. Exactly the amount, not unlimited.
 */
export async function ensureAllowance(account: string, token: string, spender: string, amount: bigint) {
  await onChain()
  const allowance = await call(token, '0xdd62ed3e' + pad(account) + pad(spender))
  if (allowance >= amount) return
  const hash = await request<string>('eth_sendTransaction', [{ from: account, to: token, data: '0x095ea7b3' + pad(spender) + pad(amount.toString(16)) }])
  for (let i = 0; i < 90; i++) {
    const receipt = await request<{ status: string } | null>('eth_getTransactionReceipt', [hash])
    if (receipt) {
      if (receipt.status !== '0x1') throw new Error('The approval failed on-chain.')
      return
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('The approval is still pending. Try again once it confirms.')
}

/** Burns the boost for `hours` and resolves with the transaction hash once it's mined. */
export async function burnBoost(account: string, agent: string, hours: number): Promise<string> {
  await onChain()
  const amount = await boostCost(hours)
  return send(account, TOKEN.address, TOKEN.symbol, amount, BURN + pad(amount.toString(16)) + BOOST_TAG + agent.replace(/^0x/, '').toLowerCase())
}

/** Burns whole `tokens` of an 18-decimal token, e.g. to get into Baum (BURN_TO_ENTER). */
export async function burnTokens(account: string, token: string, symbol: string, tokens: number): Promise<string> {
  const amount = BigInt(tokens) * 10n ** 18n
  return send(account, token, symbol, amount, '0xa9059cbb' + pad(DEAD) + pad(amount.toString(16)))
}

export const txUrl = (hash: string) => `${CHAIN.explorer}/tx/${hash}`
export const tokenUrl = () => `${CHAIN.explorer}/token/${TOKEN.address}`
