// Every number the platform's economics depend on lives here, so a change is one edit.
// Env values use || so an empty variable (as CI passes an unset one) keeps the default.
// None of this is enforced on-chain yet: see TODO.md.

export const STAGE = 'Beta'

export const BRAND = {
  name: 'SLUGS',
  // Where SLUGS is talked about on X. Invite requests tag it (see ACCESS).
  x: 'slugsrun',
}

// SLUGS is invite only, the way Baum is. Everyone who deploys a slug gets a Baum
// account through SLUGS' referral code; a newcomer is asked by Baum in Telegram to
// follow and tag the SLUGS account on X, and is let in once approved.
export const ACCESS = {
  applyPost: `Hey @${BRAND.x} I want access to SLUGS.`,
  // Where a wallet is linked to a Baum account, so Baum can see its burns.
  linkWallet: 'https://baumai.xyz/account',
}

// Burning either of these from a wallet linked to the Baum account skips the
// invite line. Baum checks the linked wallet's burns, all time; the amounts must
// match Baum's (lib/burn-to-enter-view.ts and SLUGS' partner config there).
// Both tokens are on Robinhood Chain with 18 decimals.
export const BURN_TO_ENTER = [
  { symbol: 'SLUGS', address: import.meta.env.VITE_TOKEN_ADDRESS || '0xa5A0A37778D6b656A37b2E10c13E2E31826ff10A', amount: 3_000_000 },
  { symbol: 'BAUM', address: '0xc17FBa7484bdB276C2b5A7593E14fcAF21155C45', amount: 750_000 },
] as const

// The SLUGS × Baum strategic partnership announcement on the front page.
// Set the article link here (or VITE_PARTNERSHIP_URL) once it's published.
export const PARTNERSHIP = {
  articleUrl: import.meta.env.VITE_PARTNERSHIP_URL || '',
}

export const TOKEN = {
  symbol: import.meta.env.VITE_TOKEN_SYMBOL || 'SLUGS',
  // SLUGS on Baum's launchpad (Pons, Robinhood Chain).
  address: import.meta.env.VITE_TOKEN_ADDRESS || '0xa5A0A37778D6b656A37b2E10c13E2E31826ff10A',
}

// Where the token lives.
export const CHAIN = {
  id: 4663,
  name: 'Robinhood Chain',
  rpc: 'https://rpc.mainnet.chain.robinhood.com',
  explorer: 'https://robinhoodchain.blockscout.com',
}

export const BAUM = {
  bot: import.meta.env.VITE_BAUM_BOT || 'BaumReviewBot',
  // SLUGS' Baum referral code: every user sent to Baum is attributed to it, and Baum
  // holds newcomers on it for approval (invite only).
  // Keep it to 13 characters or fewer, or copy links (atp-copy-<40 hex>-CODE) overflow Telegram's 64.
  referralCode: import.meta.env.VITE_BAUM_REF || 'MINT-FLASH-38',
}

export const FEES = {
  // Burned to boost a listing to the top of its category and the vaults page.
  boostPerHour: 100_000,
  // Opening a vault costs whichever is less.
  vaultOpenTokens: 1_000_000,
  vaultOpenUsd: 100,
  // Platform share of a vault's fees, by how the depositor found it.
  platformShareDiscovered: 0.3, // found through this platform's promotion
  platformShareDirect: 0.1, // came from an outside link or the vault operator
  // Added on top of Baum's swap fee on this app's swap page.
  swapBps: 10,
}

// Where platform fee revenue goes. Shares must sum to 1.
export const FEE_SPLIT = [
  { key: 'burn', label: 'Buy back & burn', share: 0.5 },
  { key: 'top3', label: 'Weekly prize: top 3 strategies', share: 0.1 },
  { key: 'stakers', label: 'Stakers', share: 0.1 },
  { key: 'treasury', label: 'Treasury & operations', share: 0.3 },
] as const

// Categories are the strategy an agent runs, declared by its owner in Baum
// (/agent strategy). An agent that hasn't declared one gets a suggested category
// from how it trades (BEHAVIOR_SUGGESTS); that behaviour also shows as tags.
export const CATEGORIES = [
  'Trenchers',
  'Spot traders',
  'Perp traders',
  'Stocks',
  'Options',
  'Copy trading',
  'Yield',
  'Custom',
] as const
export type Category = (typeof CATEGORIES)[number]

// Baum's strategy ids (/agent strategy <id>) and the category each lists under.
export const STRATEGY_CATEGORY: Record<string, Category> = {
  trenchers: 'Trenchers',
  spot: 'Spot traders',
  perps: 'Perp traders',
  stocks: 'Stocks',
  options: 'Options',
  copy: 'Copy trading',
  yield: 'Yield',
  custom: 'Custom',
}

// Baum's behaviour sorting (from on-chain trades): the tag it shows as, and the
// category it suggests for an agent that hasn't declared a strategy.
export const BEHAVIOR: Record<string, { tag: string | null; suggests: Category }> = {
  Snipers: { tag: 'Sniper', suggests: 'Trenchers' },
  Memecoins: { tag: 'Many launches', suggests: 'Trenchers' },
  Flippers: { tag: 'Sells fast', suggests: 'Trenchers' },
  Holders: { tag: 'Holds', suggests: 'Trenchers' },
  Creators: { tag: 'Trades own token', suggests: 'Trenchers' },
  'BAUM traders': { tag: 'Mostly BAUM', suggests: 'Spot traders' },
  Discretionary: { tag: null, suggests: 'Custom' },
}
