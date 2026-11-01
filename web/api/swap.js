// Swaps on the swap page, priced by Baum (baum-monorepo app/api/partner/swap): Baum
// answers with a transaction for the person's own wallet to sign, Baum's fee in front
// and SLUGS' fee on top. The key stays here, and so does SLUGS' fee, set in Vercel:
//
//   SLUGS_FEE_BPS        how much: 25 = 0.25%, at most 100
//   SLUGS_FEE_RECIPIENT  where it goes, optional
//
// Without SLUGS_FEE_BPS there's no SLUGS fee. Without SLUGS_FEE_RECIPIENT Baum pays
// it to SLUGS' fee wallet, a Baum wallet in the key holder's account ("SLUGS fees"),
// which Baum makes the first time and which can be switched to another address at
// baum-monorepo /api/partner/account/fee-wallet. While SLUGS is on its bonding curve an ETH buy
// goes straight to the curve, which has nowhere to carry a fee; Baum's quote says so.
//
//   POST { amount, address }  a buy of SLUGS with `amount` ETH, for `address` to sign

const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
const TOKEN = process.env.VITE_TOKEN_ADDRESS || '0xa5A0A37778D6b656A37b2E10c13E2E31826ff10A'

function partnerFee() {
  const recipient = process.env.SLUGS_FEE_RECIPIENT
  const bps = Number(process.env.SLUGS_FEE_BPS ?? 0)
  if (!Number.isInteger(bps) || bps <= 0) return undefined
  return recipient ? { recipient, bps } : { bps }
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  if (!process.env.BAUM_API_KEY) return res.status(503).json({ reason: 'Swaps aren’t set up on this site yet.' })
  if (req.method !== 'POST') return res.status(405).json({ reason: 'method' })
  const amount = String(req.body?.amount ?? '').trim()
  const address = String(req.body?.address ?? '').trim()
  if (!/^\d*\.?\d+$/.test(amount) || !/^0x[0-9a-fA-F]{40}$/.test(address)) return res.status(400).json({ reason: 'Send an amount of ETH and your wallet address.' })
  const answer = await fetch(`${BAUM}/api/partner/swap`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.BAUM_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ token: TOKEN, side: 'buy', amount, address, partnerFee: partnerFee() }),
  }).catch(() => null)
  const json = answer ? await answer.json().catch(() => ({})) : { reason: 'Couldn’t reach Baum. Try again in a minute.' }
  return res.status(answer?.status ?? 502).json(json)
}
