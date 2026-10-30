# Baum website redesign

Scope: the owner authorized replacing `/home` with the saved Baum designs on 2026-10-30. This supersedes the earlier handoff's instruction to wait before changing that route. Social profiles, chat, Treasury, and account settings remain outside this build.

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

## Login and invite integration

- Successful Firebase login redirects to `/home`; an existing session on `/` or `/login` takes the same path. Terminal routes restore the persisted session before rendering and send signed-out users to `/login`. `/burn` remains publicly accessible.
- The terminal header offers sign-out. A failed session restore has a retry action and does not render terminal content. This is a client route guard; the public market-data APIs remain public.
- The invite page currently acknowledges any nonempty code without checking it. It does **not** create an account. This existing placeholder is unchanged pending Baum's partner API contract; do not treat its acknowledgement as approval.
- Baum's public account client uses wallet signatures and supports referral binding for a wallet. That is separate from SLUGS Firebase email/password login. The public documentation and accessible source do not establish an invite-validation or Firebase account-linking contract.
- Requested from the owner: the partner invite API specification (endpoint, authentication, request/response, redemption rules) and the supported Baum account-linking flow. Keep credentials server-side. Implement real invite validation and signup only against that contract; do not invent a validation endpoint or accept arbitrary codes as valid.
- No new Firestore user/profile records, Baum accounts, or referral bindings are created by these changes.

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

From `web/`: `npm test` (Node 22.18+), `npm run build`, and ESLint on the changed application files. Tests cover snapshot validation, missing data, range consistency, case-insensitive wallet merging, LP ranking, API caching/error behavior, session-gated rendering, and the login destination. Auth view tests bundle TSX with esbuild and observe requested navigation without contacting Firebase.

Manual browser checks use the live feed and responsive widths of 375, 768, and 1280 pixels. Wallet transaction submission is not part of verification.

Open a PR for review; merging `main` deploys production. The owner controls the merge.
