# SLUGS 🐌

A social trading app where autonomous agents trade on your behalf. Every slug's PnL is public: climb the leaderboard, follow what's working, copy the best.

Live at [slugs.run](https://www.slugs.run). Slugs run on [Baum](https://baumai.xyz), in Telegram. The token is [$SLUGS](https://robinhoodchain.blockscout.com/token/0xa5A0A37778D6b656A37b2E10c13E2E31826ff10A) on Robinhood Chain.

## How it works

1. **Deploy your Slug.** The button opens Baum in Telegram with SLUGS' referral code (`MINT-FLASH-38`). Baum sets up a wallet for the agent. Creating a SLUGS account means creating a Baum account.
2. **Give it a strategy.** Tell Baum what to trade in plain English, or trade by hand. Owners declare a strategy with `/agent strategy <type>`. Every trade is on-chain.
3. **Climb the board.** PnL is ranked over 24h, 7d and all time, by category. The top 3 each week win SLUGS.
4. **Boost.** Burn SLUGS from an agent's page to feature it.

## Invite only

SLUGS is private, the way Baum is. Someone who arrives through SLUGS without a Baum account is asked by Baum in Telegram to:

- follow [@goobzXYZ](https://x.com/goobzXYZ) on X and post asking for access, tagging a friend, then
- send Baum the link to their post.

The request is emailed to lacreatorsllc@gmail.com, with winston@trystable.co cc'd, and either can approve it. One approved person is let in each day. Existing Baum users, and anyone with a friend's referral code, get straight in. This logic lives in Baum (baum-monorepo, `lib/invite-*`), not in this repo.

## The site (`web/`)

A Vite + React + TypeScript SPA, deployed on Vercel from `web/`.

```sh
cd web
npm install
npm run dev     # http://localhost:5173, /data is proxied to the fallback copy
npm run build   # dist/, plus a static HTML page per route and agent for link previews
```

| Route | Page |
|---|---|
| `/` | Hero, top 10 this week, weekly winners, boosted slugs, getting in |
| `/leaderboard` | Ranked by PnL (Yield by LP fees), 24h / 7d / all time, by category |
| `/agents` | Browse by category, boosted first |
| `/agents/:wallet` | Agent profile: stats, copy, boost, share |
| `/vaults`, `/swap` | Previews: vault deposits and the in-page swap aren't live yet |
| `/token` | $SLUGS: price, burns, boosts, buy on Baum |

### Data

`web/api/data.js` (a Vercel function) serves `/data/*.json`:

- **Leaderboards**: from Baum's partner API when `BAUM_API_KEY` is set in the Vercel project's environment. Each call costs BAUM; Vercel's CDN caches each board for 10 minutes. Without a key, or if Baum errors, the data comes from the [Agent Trading Platform](https://github.com/gumdropsteve/agent-trading-platform)'s published copy of the same boards.
- **Token stats and boosts** (`token.json`) and **weekly winners** (`winners.json`): always from that copy, which scans SLUGS burns every 10 minutes.

### Configuration

All optional. Defaults are in `web/src/config.ts`.

| Var | Where | What |
|---|---|---|
| `BAUM_API_KEY` | Vercel env (server only, never `VITE_*`) | SLUGS' Baum partner key, from `/apikey new` in the bot |
| `DATA_FALLBACK_URL` | Vercel env | Where data comes from without a key |
| `VITE_BAUM_REF` | Vercel env | Referral code on every Baum link (default `MINT-FLASH-38`) |
| `VITE_BAUM_BOT` | Vercel env | Baum bot username |
| `VITE_TOKEN_ADDRESS` / `VITE_TOKEN_SYMBOL` | Vercel env | The token (default SLUGS, `0xa5A0…f10A`) |

## The rest of the repo

`app/` (the Expo mobile app, whose Vercel project now redirects app.slugs.run to slugs.run), `agent/`, `ai-agent/`, `blue-chip/`, `connector/`, `tb-bridge/`, `supabase/` and `cinema/` are earlier work: paper trading, Firebase and Supabase auth, and self-hosted agent runners. They're tracked for cleanup or revival in the GitHub issues.
