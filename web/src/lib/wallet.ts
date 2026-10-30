import { CHAIN, FEES, TOKEN } from '../config'

// The browser wallet (MetaMask, Rabby, Coinbase…), spoken to directly over EIP-1193
// so the site needs no wallet library for the one transaction it sends.

type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown> }
const provider = () => (window as unknown as { ethereum?: Eip1193 }).ethereum

export const hasWallet = () => Boolean(provider())

export const DEAD = '0x000000000000000000000000000000000000dEaD'
// A boost is a transfer to the dead address with "ATPB" and the agent's wallet
// appended to the calldata. Token contracts ignore trailing calldata; the Pages
// job (scripts/fetch-token.mjs) reads it back to credit the boost.
const BOOST_TAG = '41545042'

const pad = (hex: string) => hex.replace(/^0x/, '').padStart(64, '0')
const chainHex = '0x' + CHAIN.id.toString(16)

async function request<T>(method: string, params?: unknown[]): Promise<T> {
  const eth = provider()
  if (!eth) throw new Error('No wallet found. Install MetaMask or Rabby, or open this page in your wallet\'s browser.')
  return (await eth.request({ method, params })) as T
}

export async function connect(): Promise<string> {
  const [account] = await request<string[]>('eth_requestAccounts')
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
  return account
}

const tokenCall = (data: string) => request<string>('eth_call', [{ to: TOKEN.address, data }, 'latest']).then(BigInt)

export async function boostCost(hours: number) {
  const decimals = await tokenCall('0x313ce567')
  return BigInt(FEES.boostPerHour * hours) * 10n ** decimals
}

export const tokenBalance = (account: string) => tokenCall('0x70a08231' + pad(account))

/** Burns the boost for `hours` and resolves with the transaction hash once it's mined. */
export async function burnBoost(account: string, agent: string, hours: number): Promise<string> {
  const amount = await boostCost(hours)
  if ((await tokenBalance(account)) < amount) throw new Error(`Not enough ${TOKEN.symbol} in ${account.slice(0, 6)}…${account.slice(-4)}.`)
  const data = '0xa9059cbb' + pad(DEAD) + pad(amount.toString(16)) + BOOST_TAG + agent.replace(/^0x/, '').toLowerCase()
  const hash = await request<string>('eth_sendTransaction', [{ from: account, to: TOKEN.address, data }])
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

export const txUrl = (hash: string) => `${CHAIN.explorer}/tx/${hash}`
export const tokenUrl = () => `${CHAIN.explorer}/token/${TOKEN.address}`
