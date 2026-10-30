import { CHAIN, FEES, TOKEN } from '../config'

// The browser wallet (MetaMask, Rabby, Coinbase…), spoken to directly over EIP-1193
// so the site needs no wallet library for the one transaction it sends.

type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown> }
const provider = () => (window as unknown as { ethereum?: Eip1193 }).ethereum

export const hasWallet = () => Boolean(provider())

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

export async function connect(): Promise<string> {
  const [account] = await request<string[]>('eth_requestAccounts')
  await switchChain()
  return account
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
