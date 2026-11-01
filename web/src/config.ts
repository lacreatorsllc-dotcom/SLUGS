// Every number the platform's economics depend on lives here, so a change is one edit.
// Env values use || so an empty variable (as CI passes an unset one) keeps the default.
// None of this is enforced on-chain yet: see TODO.md.

export const STAGE = 'Beta'

export const BRAND = {
  name: 'SLUGS',
  // Where SLUGS is talked about on X. Invite requests tag it (see ACCESS).
  x: 'slugsrun',
  // The SLUGS community group. Baum's bot links stay on BAUM.bot (sign-in, deploy, copy).
  telegram: 'https://t.me/+FVEQ8dulnv1mOGYx',
}

// SLUGS is invite only, the way Baum is. Everyone who deploys a slug gets a Baum
// account through SLUGS' referral code; a newcomer is asked by Baum in Telegram to
// follow and tag the SLUGS account on X, and is let in once approved.
export const ACCESS = {
  applyPost: `Hey @${BRAND.x} I want access to SLUGS.`,
  // Where a wallet is linked to a Baum account, so Baum can see its burns.
  linkWallet: 'https://baumai.xyz/account',
}

// Burning this from a wallet linked to the Baum account skips the invite line.
// Baum checks the linked wallet's burns, all time; the amount must match Baum's
// (SLUGS' partner config there). Baum also lets anyone in for 750,000 BAUM, but
// this is the SLUGS app, so it offers SLUGS. Robinhood Chain, 18 decimals.
export const BURN_TO_ENTER = {
  symbol: 'SLUGS',
  address: import.meta.env.VITE_TOKEN_ADDRESS || '0xa5A0A37778D6b656A37b2E10c13E2E31826ff10A',
  amount: 3_000_000,
} as const

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
  // holds newcomers on it for approval (invite only). SLUGS (or GOOBZ) is an alias
  // Baum resolves to Gabe's code, MINT-FLASH-38, wherever a code arrives, so links
  // read cleanly and credit him the same.
  // Keep it to 13 characters or fewer, or copy links (atp-copy-<40 hex>-CODE) overflow Telegram's 64.
  referralCode: import.meta.env.VITE_BAUM_REF || 'SLUGS',
}

// Paper strategies launched from SLUGS: the starting balances SLUGS offers, the first the
// default. Baum enforces the same list for a launch from here (baum-monorepo lib/paper-view.ts
// SLUGS_PAPER_CAPITAL_CHOICES), so open another size there first, then add it here.
// A strategy doesn't have to spend all of it: it can use all or part, the rest stays as paper cash.
export const PAPER_LAUNCH = {
  sizes: [10_000, 100_000] as readonly number[],
  defaultSize: 10_000,
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
  'The Floor',
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
  trenchers: 'The Floor',
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
  Snipers: { tag: 'Sniper', suggests: 'The Floor' },
  Memecoins: { tag: 'Many launches', suggests: 'The Floor' },
  Flippers: { tag: 'Sells fast', suggests: 'The Floor' },
  Holders: { tag: 'Holds', suggests: 'The Floor' },
  Creators: { tag: 'Trades own token', suggests: 'The Floor' },
  'BAUM traders': { tag: 'Mostly BAUM', suggests: 'Spot traders' },
  Discretionary: { tag: null, suggests: 'Custom' },
}
