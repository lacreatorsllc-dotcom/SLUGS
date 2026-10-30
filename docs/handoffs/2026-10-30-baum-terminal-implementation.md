# Baum website redesign

Scope: the owner authorized replacing `/home` with the saved Baum designs on 2026-10-30. This supersedes the earlier handoff's instruction to wait before changing that route. Social profiles, onboarding, chat, Treasury, and account settings remain outside this build.

## Routes

| Route | Saved design |
| --- | --- |
| `/home`, `/leaderboard` | Main: category filters, matching time-range metrics, boosted strip, agent preview cards |
| `/agents` | Agent directory using the same table and search |
| `/agents/:id` | Agent: performance, copy on Baum, vault terms, boost duration and wallet confirmation |
| `/agents/compare?ids=…` | Compare: up to four agents, highlight best, add/remove agents, shareable selections |
| `/vaults` | Vaults: terms, empty state, performance fee preview, disabled opening/deposits |
| `/token` | Token: live statistics, fee split, uses, fees, recent boosts |
| `/swap` | Swap: buy/sell, amount presets, currency selection, chart/quote placeholders, trade on Baum |
| `/burn` | Burn: select SLUGS/BAUM, preview permanent burn, confirm in wallet, link wallet on Baum |

`/`, `/login`, and `/reset-password` keep their existing pages and stylesheet. Swap remains under $SLUGS rather than adding another top navigation tab. The terminal font is a locally served Inter variable font with its license in `web/public/fonts/`.

## Data and actions

- Reuses `/data/leaderboard-{24h,7d,all}.json`, `/data/lps-{24h,7d,all}.json`, and `/data/token.json`. No API key reaches the browser.
- All performance columns use the selected range's snapshot. Missing ranges/metrics stay unavailable; failed requests have retry actions. No sample performance is substituted.
- Yield ranks by LP fees, with liquidity, positions, and APR from the LP snapshot.
- Copy opens a review card and the existing Baum referral deep link. Counter trading is disabled until Baum supports it.
- Vault creation/deposits, price history, and in-page swap quotes stay visibly unavailable. Preview swap amounts are explicitly not forwarded to Baum.
- Boost and access burns show the amount, network, and permanent burn before invoking the existing wallet helpers. A returned transaction is described as submitted, with an explorer link, rather than claiming it has confirmed.
- On-demand PnL cards use the same live snapshot and open only from a chart action. Native dialogs provide modal behavior and Escape dismissal; motion respects reduced-motion preferences.
- API responses use `s-maxage=3600`; static asset caching and `vercel.json` remain unchanged.

## Verification

From `web/`: `npm test` (Node 22.18+), `npm run build`, and ESLint on the changed application files. Tests cover snapshot validation, missing data, range consistency, case-insensitive wallet merging, LP ranking, and API caching/error behavior.

Manual browser checks use the live feed and responsive widths of 375, 768, and 1280 pixels. Wallet transaction submission is not part of verification.

Open a PR for review; merging `main` deploys production. The owner controls the merge.
