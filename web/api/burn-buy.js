// Buying the SLUGS to burn on /burn, priced by Baum (baum-monorepo app/api/partner/swap):
// the person pays with ETH, USDG or USDX and Baum answers with a transaction for
// their own wallet to sign. The buy aims at 3,300,000 SLUGS so slippage can't leave
// it short of the 3,000,000 burned; what's over stays in their wallet.
//
// One fee, 1% of what's paid: SLUGS' 0.1%, and Baum keeps the rest after whatever the
// swap API charges. SLUGS' 0.1% goes to SLUGS_FEE_RECIPIENT when that's set in Vercel,
// and otherwise to SLUGS' fee wallet, which Baum makes and keeps in the key holder's
// account ("SLUGS fees"). The curve's own 1% is the market price, shown on its own line.
//
//   POST { payWith: 'ETH' | 'USDG' | 'USDX', address }

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const TOKEN = process.env.VITE_TOKEN_ADDRESS || '0xa5A0A37778D6b656A37b2E10c13E2E31826ff10A'

const PAY_WITH = {
  ETH: 'ETH',
  USDG: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
  USDX: '0x44d6B2EfF8242875d2B640fe3805ABf866614CB3',
}
const BUY_TARGET = '3300000'
const BURN_AMOUNT = '3000000'
const TOTAL_FEE_BPS = 100
const SLUGS_FEE_BPS = 10

function slugsFee() {
  const recipient = process.env.SLUGS_FEE_RECIPIENT
  return recipient ? { recipient, bps: SLUGS_FEE_BPS } : { bps: SLUGS_FEE_BPS }
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!process.env.BAUM_API_KEY) return res.status(503).json({ reason: 'Buying to burn isn’t set up on this site yet.' })
  if (req.method !== 'POST') return res.status(405).json({ reason: 'method' })
  const payWith = PAY_WITH[String(req.body?.payWith ?? '')]
  const address = String(req.body?.address ?? '').trim()
  if (!payWith || !/^0x[0-9a-fA-F]{40}$/.test(address)) return res.status(400).json({ reason: 'Pay with ETH, USDG or USDX, from your wallet address.' })
  const answer = await fetch(`${BAUM}/api/partner/swap`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.BAUM_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ token: TOKEN, side: 'buy', address, payWith, target: BUY_TARGET, minOut: BURN_AMOUNT, totalFeeBps: TOTAL_FEE_BPS, partnerFee: slugsFee() }),
  }).catch(() => null)
  const json = answer ? await answer.json().catch(() => ({})) : { reason: 'Couldn’t reach Baum. Try again in a minute.' }
  return res.status(answer?.status ?? 502).json(json)
}
