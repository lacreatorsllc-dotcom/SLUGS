import { CHAIN, TOKEN } from '../config'

// Quotes for the swap page, read in the browser straight off Robinhood Chain.
//
// SLUGS trades on its Pons bonding curve until it graduates to Uniswap. The
// curve is constant product over its reserves (getReserves), with its fee
// (feeBps, 1% today) taken from what is paid in on a buy and from what is paid
// out on a sell. Checked on 2026-10-30 against the curve's own buy and sell,
// simulated on chain: both matched to the last wei. So an ETH ⇄ SLUGS quote
// here is exact for the moment it was read.
//
// BAUM and USDG reach the curve through ETH first, at market price
// (DexScreener), so those quotes are estimates and say so.

export type SwapToken = { symbol: string; name: string; address: string; decimals: number; logo: string }

const NATIVE = '0x0000000000000000000000000000000000000000'
const WETH = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73'

// Logos load from small, fast sources: the IPFS gateway took five seconds to
// send BAUM's 290KB original, so it comes from DexScreener's CDN at 64px.
export const SWAP_TOKENS: SwapToken[] = [
  { symbol: TOKEN.symbol, name: 'Slugs', address: TOKEN.address, decimals: 18, logo: `${import.meta.env.BASE_URL}slugs-token.svg` },
  { symbol: 'ETH', name: 'Ether', address: NATIVE, decimals: 18, logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png' },
  { symbol: 'BAUM', name: 'Baum', address: '0xc17FBa7484bdB276C2b5A7593E14fcAF21155C45', decimals: 18, logo: 'https://cdn.dexscreener.com/cms/images/DEi7_jxv5LcXOtWP?width=64&height=64&quality=95&format=auto' },
  { symbol: 'USDG', name: 'Global Dollar', address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168', decimals: 6, logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/33793.png' },
]

export const tokenBySymbol = (s: string) => SWAP_TOKENS.find((t) => t.symbol === s)!

// Baum's own swap fee on Robinhood Chain, by Deed Deck tier (Baum's lib/fee-tier.ts).
export const BAUM_FEE_BPS = { holder: 2, gifted: 15, none: 100 } as const

// What the minimum received allows for between this quote and the fill.
export const SLIPPAGE_BPS = 100

// ---- Curve maths (pure) ----------------------------------------------------

export type Curve = { quoteReserve: bigint; tokenReserve: bigint; feeBps: bigint; graduated: boolean }

const BPS = 10_000n

/** SLUGS out for `ethIn` wei. The fee comes off what is paid in. */
export function curveBuy(c: Curve, ethIn: bigint): bigint {
  const net = (ethIn * (BPS - c.feeBps)) / BPS
  return (c.tokenReserve * net) / (c.quoteReserve + net)
}

/** ETH (wei) out for `tokensIn`. The fee comes off what is paid out. */
export function curveSell(c: Curve, tokensIn: bigint): bigint {
  const gross = (c.quoteReserve * tokensIn) / (c.tokenReserve + tokensIn)
  return gross - (gross * c.feeBps) / BPS
}

/** ETH per SLUGS at the margin, before fee: the price a trade of nothing would get. */
export const spotEthPerToken = (c: Curve) => Number(c.quoteReserve) / Number(c.tokenReserve)

// ---- Reads -------------------------------------------------------------------

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(CHAIN.rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
  })
  const body = (await res.json()) as { result?: string; error?: { message?: string } }
  if (!body.result) throw new Error(body.error?.message ?? `The chain answered ${res.status}`)
  return body.result
}

let curveAddress: Promise<string> | undefined

/** The token's curve, its reserves and fee, read now. */
export async function readCurve(): Promise<Curve> {
  // curve() on the token names its bonding curve.
  curveAddress ??= ethCall(TOKEN.address, '0x7165485d').then((r) => '0x' + r.slice(-40))
  const curve = await curveAddress
  const [reserves, fee, graduated] = await Promise.all([
    ethCall(curve, '0x0902f1ac'), // getReserves()
    ethCall(curve, '0x24a9d853'), // feeBps()
    ethCall(curve, '0xe7c2b772'), // graduated()
  ])
  return {
    quoteReserve: BigInt('0x' + reserves.slice(2, 66)),
    tokenReserve: BigInt('0x' + reserves.slice(66, 130)),
    feeBps: BigInt(fee),
    graduated: BigInt(graduated) !== 0n,
  }
}

/** USD prices for ETH, BAUM and USDG on Robinhood Chain, from DexScreener's deepest pools. */
export async function readPrices(): Promise<Record<string, number>> {
  const want = { ETH: WETH, BAUM: tokenBySymbol('BAUM').address }
  const res = await fetch(`https://api.dexscreener.com/tokens/v1/robinhood/${Object.values(want).join(',')}`)
  if (!res.ok) throw new Error(`Prices answered ${res.status}`)
  const pairs = (await res.json()) as { baseToken: { address: string }; priceUsd?: string; liquidity?: { usd?: number } }[]
  const out: Record<string, number> = { USDG: 1 }
  for (const [symbol, address] of Object.entries(want)) {
    const best = pairs
      .filter((p) => p.baseToken.address.toLowerCase() === address.toLowerCase() && p.priceUsd)
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0]
    if (best) out[symbol] = Number(best.priceUsd)
  }
  return out
}

// ---- The quote -------------------------------------------------------------

export type Quote = {
  amountIn: number
  amountOut: number
  /** Exact off the curve, or estimated through a market-priced first hop. */
  exact: boolean
  route: string[]
  /** How much worse than the marginal price, from the trade's own size, %. */
  impactPct: number
  curveFeePct: number
  usdIn: number | null
  usdOut: number | null
  /** After Baum's highest fee tier and SLIPPAGE_BPS. */
  minOut: number
}

const toUnits = (n: number, decimals: number) => BigInt(Math.floor(n * 10 ** Math.min(decimals, 12))) * 10n ** BigInt(Math.max(decimals - 12, 0))
const fromUnits = (n: bigint, decimals: number) => Number(n) / 10 ** decimals

/**
 * `amount` of `from` into `to`, where one side is SLUGS. Pure, given the curve
 * and prices just read.
 */
export function quote(from: SwapToken, to: SwapToken, amount: number, c: Curve, prices: Record<string, number>): Quote {
  const buying = to.symbol === TOKEN.symbol
  const other = buying ? from : to
  const ethUsd = prices.ETH ?? null
  const otherUsd = prices[other.symbol] ?? null
  const spot = spotEthPerToken(c)
  const fee = Number(c.feeBps) / 100

  let amountOut: number
  let impactPct: number
  if (buying) {
    // Anything but ETH becomes ETH at market first.
    const ethIn = other.symbol === 'ETH' ? amount : otherUsd && ethUsd ? (amount * otherUsd) / ethUsd : 0
    amountOut = fromUnits(curveBuy(c, toUnits(ethIn, 18)), 18)
    const fair = ethIn / spot
    impactPct = fair > 0 ? Math.max(0, (1 - amountOut / (fair * (1 - fee / 100))) * 100) : 0
  } else {
    const ethOut = fromUnits(curveSell(c, toUnits(amount, 18)), 18)
    const fair = amount * spot
    impactPct = fair > 0 ? Math.max(0, (1 - ethOut / (fair * (1 - fee / 100))) * 100) : 0
    amountOut = other.symbol === 'ETH' ? ethOut : otherUsd && ethUsd ? (ethOut * ethUsd) / otherUsd : 0
  }

  const tokenUsd = ethUsd ? spot * ethUsd : null
  const usdOf = (t: SwapToken, n: number) => (t.symbol === TOKEN.symbol ? (tokenUsd ? n * tokenUsd : null) : prices[t.symbol] ? n * prices[t.symbol] : null)
  const keep = (1 - BAUM_FEE_BPS.none / 10_000) * (1 - SLIPPAGE_BPS / 10_000)
  const viaEth = other.symbol !== 'ETH'

  return {
    amountIn: amount,
    amountOut,
    exact: !viaEth,
    route: [from.symbol, ...(viaEth ? ['ETH'] : []), to.symbol],
    impactPct,
    curveFeePct: fee,
    usdIn: usdOf(from, amount),
    usdOut: usdOf(to, amountOut),
    minOut: amountOut * keep,
  }
}
