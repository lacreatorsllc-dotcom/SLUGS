import { BAUM, TOKEN } from '../config'

// Deep links into the Baum Telegram bot. Every link carries this app's referral code,
// so Baum attributes the user (and their fees) to the platform.
// Payloads are handled by Baum's /start parser.
// Telegram caps a start payload at 64 characters.

const code = BAUM.referralCode.toUpperCase()

function tg(payload: string) {
  return `https://t.me/${BAUM.bot}?start=${payload.slice(0, 64)}`
}

export const baumLinks = {
  launch: () => tg(`atp-launch-${code}`),
  register: () => tg(`atp-register-${code}`),
  copy: (wallet: string) => tg(`atp-copy-${wallet.replace(/^0x/i, '').toLowerCase()}-${code}`),
  // Plain referral: the fallback for anything without a dedicated funnel yet.
  ref: () => tg(`ref-${code}`),
  // Log in to SLUGS: Baum answers with a one-time button to /connect-baum
  // (Baum's private-partners signInUrl). Newcomers get the invite flow first.
  login: () => tg(`atp-login-${code}`),
  // A friend's invite code is their Baum referral code, which lets them straight in.
  invite: (friend: string) => tg(`ref-${friend.toUpperCase()}`),
  // A guest from a friend's invite link makes their account: Baum lets them in on the
  // friend's code, credits the friend, and sends SLUGS' sign-in button back.
  join: (friend: string) => tg(`slug-join-${friend.toUpperCase()}`),
}

// A token's page on Baum's launchpad (ours by default), where anyone can buy or sell it. Carries the
// referral code the way Baum's site spells it (?ref=).
export const buyUrl = (address: string = TOKEN.address) => `https://baumai.xyz/launch/${address}?ref=${code}`

// The token's page on Pons, the launchpad it launched on (Robinhood Chain).
export const ponsUrl = () => `https://ponsfamily.com/launchpad/${TOKEN.address}`
