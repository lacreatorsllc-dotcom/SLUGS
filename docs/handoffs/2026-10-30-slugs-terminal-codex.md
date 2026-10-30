# Handoff: SLUGS Terminal UI (for Codex)

Date: 2026-10-30 · Owner: @lacreatorsllc-dotcom · Repo: `lacreatorsllc-dotcom/SLUGS` · App: `web/` (Vite + React + TS, deployed by Vercel project `slugs-run` from `main`)

## What this is

SLUGS is redoing its signed-in platform as a **terminal-style web app** in the spirit of Axiom (axiom.trade) and Proxima (proxima.tools): dark, quiet, dense, small type, small icon buttons, floating cards. It brings together:

- what SLUGS already had in the old Expo app (`app/`): social features (follow, followers, chat), settings, user ID, connect wallet, agent wallets, PnL cards, onboarding,
- Baum's features already on the site (Winston's work in `web/`): leaderboard, agent pages, boost, vaults, swap, $SLUGS token page, skip-the-line burn,
- the three things onboarding must advertise: **create and compare agents · allocate to vaults, copy trade, counter trade · tokenomics: buy/burn, fees, staking, yield.**

The designs are done. Your job is to build them.

## Where the designs are

- `docs/design/slugs-terminal/screens/*.dc.html`: 18 screens. Each is one HTML file with **inline styles that are the spec** (colors, sizes, spacing, radii, icon SVG paths). The `{{…}}`, `<sc-for>`, `<sc-if>` and the `class Component extends DCLogic` script are a mockup-runtime templating layer: read them as "loop over this data" / "show this when", not as code to keep. They won't render without that runtime; open them in an editor.
- `docs/design/slugs-terminal/canvas.json`: the screen list, titles and layout.
- The live canvas (all screens side by side, playable): https://claude.ai/artifact/WtkX5dsVEfZSBPLvngt7V2. It's private to the owner; ask them to share it with you if you need to see it rendered.

| Screen file | Route (proposed) | What it is |
|---|---|---|
| `Main` | `/home` *(see cutover)* | Leaderboard: boosted strip, 9 categories, tags, win rate, row icon actions, hover card |
| `Agent` | `/agents/:id` | Baum agent page: stats, `/agent strategy` hint, Copy on Baum, Vault, Boost (hours → live cost) |
| `Compare` | `/agents/compare?ids=` | Side-by-side agents, "highlight best" |
| `Activity` | `/agents/:id` (own/paper agent variant) | Public activity log + strategy panel |
| `Vaults` | `/vaults` | Terms, empty state, "Open a vault" panel (locked until deposits ship) |
| `Token` | `/token` | Price/MC/burned/supply, fee split, uses, platform fees, beta note |
| `Swap` | `/swap` | Buy/sell panel routed through Baum (+10 bps); chart placeholder |
| `Burn` | `/burn` (public) | Skip the line: burn 3M SLUGS → link wallet on Baum |
| `Onboarding` | first sign-in (modal) | Meet your slug, the 3 feature groups, How it works, SLUGS ID, connect wallet |
| `Search` | ⌘K palette (global) | Search slugs/agents/pages, copy @usernames |
| `Chat` | floating panel (global) | Chats, with Baum pinned; Baum replies with confirmable trade cards |
| `Profile` | `/profile` | Profile, agent wallets, settings tabs, **PnL card floats in on demand** |
| `Treasury` | `/treasury` | Main wallet, route funds to agent wallets (paper → live) |
| `Settings` | `/settings` | Account, wallets & funding, AI provider, agents, sign out |
| `Follows` | modal | Followers / following tabs |
| `EditUsername`, `EditName` | modals | Edit handle / display name |
| `ConnectAgent` | modal | Connect Claude Code / Codex / any terminal agent (`npx slugs-connector …`) |

## Hard rules (from the owner)

1. **Do not touch `/home` (`web/src/pages/Home.tsx`) until cutover.** It's the previous UI, set aside on purpose. Build the new UI beside it; switch routes only when the owner says so.
2. Keep the public front door working exactly as now: `/` invite page, `/login`, `/reset-password`, `/burn`. The invite page's look is final.
3. **No sidebar.** Navigation is a compact top bar (Leaderboard, Agents, Vaults, $SLUGS) plus a bottom status bar with small icon buttons, like Axiom.
4. **Icons, not text buttons.** Every action is a recognizable icon with `aria-label` and a `title` tooltip. Words stay only on the main confirm button of a form (e.g. "Start copying"), tabs, and settings rows.
5. **No orange buttons.** Primary = ivory fill `#ece9e2` with dark text; secondary = dark with a `#2a2824` border. Orange (`#f8622e`) is only for: the logo, top-3 ranks, burn/boost/flame, burned counts, avatar ring of the signed-in user.
6. **Copy buttons are the thin two-squares icon, no box** (see any `aria-label="Copy …"`).
7. **Font: Inter everywhere** with `font-variant-numeric: tabular-nums` for numbers. Proxima uses Inter (confirmed from its CSS). No JetBrains Mono. A system mono (`ui-monospace, 'SF Mono', Menlo`) only for terminal commands and slash commands.
8. **Floating cards animate in** (PnL card, follows, edit modals, connect agent, agent hover card). Keyframes are in `Profile.dc.html` (`pnlCardIn`) and the modal screens (`cardIn`): rise 24px + scale .96 → overshoot → settle, ~0.5s `cubic-bezier(.2,.8,.2,1)`, backdrop `rgba(4,4,4,.72)` + `blur(6px)`.
9. **PnL card is not on the page.** It only appears when a chart-line icon is clicked (profile, agent wallets, hover cards, agent page), like perp exchanges.
10. Real data or a visible `[PLACEHOLDER]`. Never invent numbers.
11. Money moves (burn, boost, deposit, copy/counter) always confirm in the user's wallet; show what will happen first. Secrets (e.g. `BAUM_API_KEY`) stay server-side.

## Design tokens

| Token | Value | Use |
|---|---|---|
| `bg` | `#0b0b0a` (front door / overlays `#050505`–`#060606`) | page |
| `bar` | `#0a0a09` | top + bottom bars |
| `panel` | `#0f0f0e`, raised `#111110`, card `#141413` | sections, inputs, hover cards |
| `line` | `#1f1e1c` (row dividers `#171615`), strong `#2a2824`, focus/selected `#5a564f` | borders |
| `text` | `#f5f3ee`, secondary `#b8b5ad`/`#9a978f`, muted `#85827a`, faint `#6f6c65` | |
| `ivory` | `#ece9e2` on `#0b0b0a` | primary buttons |
| `accent` | `#f8622e` | see rule 5 |
| `up` / `down` | `#2fd39a` / `#f87171` | PnL, status |
| ring colors | `#a78bfa #60a5fa #e879a8 #5eb6c9 #fbbf24 #f0a35e #2fd39a` | avatar rings (letter/2-char code in ring color) |
| radius | 6–8 (controls), 10–12 (inputs, tiles), 14 (sections), 18 (modals), 999 (pills) | |
| type | h1 22/600 −0.015em; section 14–15/600; body 13–13.5; labels 10.5 caps +0.1em; numbers tabular | |
| bars | top 44px, logo 14px tall; bottom 34px, icon buttons 26px | |
| controls | icon buttons 28–38px; inputs 42–44px | |

## Components to build once

TopBar · StatusBar (bottom) · IconButton (ghost / outlined / ivory) · CopyButton · AvatarRing · Chip / Tag · SegmentedControl (24H/7D/All, tabs) · StatGrid (1px-gap tiles) · DataTable (sticky header, tabular numbers, row icon actions, horizontal scroll under ~1100px) · HoverCard (agent) · Modal/FloatingCard (with the keyframes) · CommandPalette (⌘K) · ChatPanel · EmptyState · Callout (info / beta / error with retry).

## Data: what's real today and where it comes from

- **Leaderboards, agents**: `/data/leaderboard-{24h,7d,all}.json` and `/data/lps-*.json`, served by `web/api/data.js` (Baum API with `BAUM_API_KEY`, else the Agent Trading Platform's published copy). Shaped into `Agent` by `web/src/lib/agents.ts` (category, `declared`, `tags`, `winRate`, `boostedUntil`, `vault`). **Keep the server cache to hourly** (`s-maxage=3600`). Every Baum call costs credits.
- **$SLUGS stats, burns, boosts**: `/data/token.json` and `/data/winners.json` (via `lib/token.ts`, `lib/winners.ts`); on-chain burns and boosts via `lib/wallet.ts` (`burnBoost`, `burnTokens`; Robinhood Chain 4663).
- **Baum deep links**: `lib/baum.ts` (`baumLinks.copy/ref/launch/register`, `buyUrl`, referral `MINT-FLASH-38`).
- **Accounts**: Firebase Auth via `web/src/lib/auth.ts` (email/password; same project `slugs-run` as the old app).
- **Old-app social data** (profiles, follows, chats, agent wallets, activity feed, AI provider key): Firestore in project `slugs-run`, model in `app/lib/firebase.ts` and the old Expo screens in `app/app/`. Reuse the collections; don't invent new ones without asking. Note `users/{uid}` is readable by signed-in users, so never store email there.
- **Placeholders until Baum ships**: in-page swap (needs Baum's partner swap API), vault deposits, auto copy/counter trading, chat-with-Baum actions, price history for the chart, staking/yield. Build the UI with the disabled/"coming soon" states shown in the designs.

## Build order (small PRs, each with a Vercel preview)

1. Tokens + shared components (TopBar, StatusBar, IconButton, CopyButton, AvatarRing, StatGrid, DataTable, FloatingCard).
2. Leaderboard (`Main`) + agent hover card + Baum agent page (`Agent`, boost hours with live cost).
3. $SLUGS (`Token`), Vaults, Swap, Compare.
4. Signed-in shell: Profile (+ PnL card), Settings, Treasury, Follows, edit modals, ConnectAgent.
5. Onboarding (first sign-in), ⌘K Search, Chat panel with Baum pinned.
6. Cutover: route signed-in users to the new home, only with the owner's OK.

## Lessons from this week (don't repeat)

- `web/vercel.json` must not put long-lived `Cache-Control` on `/assets/*` 404s. Cloudflare cached a deploy-time 404 for a year and blanked the site (fixed in #22). Leave Vercel's asset defaults.
- The CSP in `web/vercel.json` only allows `connect-src` to self + Firebase Auth. Add any new origin (Firestore, Baum) there or requests silently fail.
- Merging to `main` deploys production. Open PRs; the owner merges.

## Open questions for the owner

- Keep the **AI provider** section in Settings, or does model choice move to Baum now that agents run there?
- **Invite codes** aren't validated yet (any text continues). Validate against a Firestore list, or Baum's gate?
- After sign-in, where do people land before cutover? (Currently a "Signed in as…" confirmation.)
- **Swap** lives under $SLUGS (cart icon), not as a top-bar tab. Confirm.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
