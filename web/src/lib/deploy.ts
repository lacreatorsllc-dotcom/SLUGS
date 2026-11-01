// Deploying a slug from SLUGS: the agent's setup, made on the Deploy page and sent to
// Baum, which makes the same agent it makes in Telegram. One Baum account sits under
// both, so an agent made either way shows up in both, with the same wallet and PnL.

export type Every = 'day' | 'week'
/** A token to buy: its contract address, or 'ETH' for the chain's own coin. */
export type TokenPick = { address: string; symbol: string }
export type Setup = { name: string; tokens: TokenPick[]; amountUsd: number; every: Every }

export const MIN_BUY_USD = 5
export const MAX_BUY_USD = 10_000
export const MAX_TOKENS = 5
export const MAX_NAME = 24

// Agents are named for what they do. The first few are the one-tap ideas; Shuffle draws
// from all of them.
export const NAME_IDEAS = ['dca-bot', 'hodl-bot', 'sniper-bot', 'copy-trader', 'spot-trader']
const MORE_NAMES = ['slugs-stacker', 'eth-stacker', 'weekly-bags', 'dip-buyer', 'quiet-compounder', 'steady-stacker', 'daily-dca']

/** Another name idea, never the current one. */
export function suggestName(current: string, random = Math.random) {
  const pool = [...NAME_IDEAS, ...MORE_NAMES].filter((name) => name !== current)
  return pool[Math.floor(random() * pool.length)]
}

/** The agent's part of its SLUG: Sniper Bot → sniper-bot, BraveAmberFox → brave-amber-fox. */
export function agentSlugPart(name: string) {
  return name.trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** What's wrong with a setup, as a sentence; null when it can be deployed. */
export function setupProblem(setup: Setup): string | null {
  if (!agentSlugPart(setup.name)) return 'Give your agent a name.'
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(setup.name.trim())) return 'Use letters, numbers, spaces or hyphens in the name.'
  if ([...setup.name.trim()].length > MAX_NAME) return `Keep the name to ${MAX_NAME} characters.`
  if (!setup.tokens.length) return 'Pick at least one token to buy.'
  if (setup.tokens.length > MAX_TOKENS) return `Pick up to ${MAX_TOKENS} tokens.`
  if (!Number.isFinite(setup.amountUsd) || setup.amountUsd < MIN_BUY_USD) return `Each buy needs to be at least $${MIN_BUY_USD}.`
  if (setup.amountUsd > MAX_BUY_USD) return `Keep each buy under $${MAX_BUY_USD.toLocaleString('en-US')}.`
  return null
}

export const perMonthUsd = (setup: Setup) =>
  setup.amountUsd * setup.tokens.length * (setup.every === 'day' ? 30 : 4)

/** The request as Baum reads it in Telegram, for when SLUGS hands the setup over. */
export function setupMessage(setup: Setup) {
  const tokens = setup.tokens.map((token) => (token.address === 'ETH' ? 'ETH' : `$${token.symbol} (${token.address})`)).join(', ')
  return `Launch an agent named ${setup.name.trim()} that buys $${setup.amountUsd} of each of ${tokens} every ${setup.every}.`
}
