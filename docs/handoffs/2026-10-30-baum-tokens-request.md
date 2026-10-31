# Request to Baum: tokens, token search, follows and display names

For: Winston / Baum. From: SLUGS. Date: 2026-10-30, follows and display names added 2026-10-31.
Design: `docs/design/slugs-terminal/screens/Tokens.dc.html` (the "Tokens" board on the design canvas).

## What SLUGS wants to show

1. **On every person and agent profile, a Tokens section with two tabs:**
   - **Launched:** the tokens this wallet launched.
   - **Traded:** the tokens it has bought or sold, with buys and sells, PnL and the last trade.
2. **Search (⌘K) finds tokens:**
   - **By ticker,** with or without `$`, partial match, ranked by market cap.
   - **By contract address:** paste a full `0x…` address and get one exact match.

Contract addresses always show in full and copy in one click, like SLUGs.

## Why we need Baum for it

- **The leaderboard only has totals.** `GET /api/leaderboard` gives `tokens` and `trades` per wallet, but not which tokens or which trades, and nothing about launches.
- **The explorer blocks server requests.** Robinhood Chain's Blockscout API sits behind a Cloudflare challenge.
- **Raw chain data falls short.** Reading token transfers from the RPC can't price trades (no PnL) or tell a launch from a buy.

Baum already indexes these trades to count them, so it is the right source.

## Endpoints requested (partner key, server to server, like `/api/partner/agent`)

### `GET /api/partner/wallet/tokens?wallet=0x…&kind=launched|traded&range=24h|7d|all`

Accepts a wallet, or an agent slug in place of the wallet.

```json
{
  "wallet": "0x…",
  "launched": [
    { "address": "0x…", "symbol": "GOOB", "name": "Goob Coin", "imageUrl": "https://…",
      "launchedAt": 1793400000000, "launchpad": "baum" | "pons",
      "priceUsd": 0.0012, "marketCapUsd": 412000 }
  ],
  "traded": [
    { "address": "0x…", "symbol": "SLUGS", "name": "SLUGS", "imageUrl": "https://…",
      "buys": 14, "sells": 3, "volumeUsd": 899.82, "pnlUsd": 182.4, "lastTradeAt": 1793400000000 }
  ]
}
```

- `traded` is sorted by `lastTradeAt`, newest first. Up to 100 rows, with a `cursor` for more.
- `pnlUsd` uses the same method as the leaderboard's `pnlUsd`, so the per-token rows add up to the profile total.

### `GET /api/partner/wallet/trades?wallet=0x…&token=0x…&cursor=…` (nice to have)

This returns single trades, for a per-token drill-down:

```json
{ "items": [{ "side": "buy", "token": "0x…", "amount": "123.45", "valueUsd": 25, "tx": "0x…", "at": 1793400000000 }], "cursor": "…" }
```

### `GET /api/partner/tokens/search?q=…`

- If `q` is a full `0x…` address, return that token as the only result.
- Otherwise match symbol and name, case-insensitive, ignoring a leading `$`. Return up to 10, highest market cap first.

```json
{ "items": [{ "address": "0x…", "symbol": "SLUGS", "name": "SLUGS", "imageUrl": "https://…",
  "priceUsd": 0.00124, "marketCapUsd": 1240000, "holders": 1482,
  "launchpad": "pons", "creator": { "wallet": "0x…", "username": "goobz" } }] }
```

## On the SLUGS side

- **Server proxies.** `api/wallet-tokens.js` and `api/token-search.js` will forward these calls, the way `api/agent.js` does. They'll keep the key on the server and cache responses for 60–300 seconds.
- **Search.** It will merge token results with the people and agents it already searches.
- **Until Baum ships this.** Profiles show the Tokens tabs empty with a short note, and the contract-address search can still resolve a token's name and ticker straight from the chain's RPC.

## Follows and display names

SLUGS has **Follow** buttons, **Followers / Following** lists and **display names** built and live, but hidden. It's waiting on a place to keep them. We'd rather Baum keep them with the account, like usernames and pictures, than run a separate database. Then they also work in Baum.

Built and waiting: `web/api/social.js`, `web/src/components/terminal/Follows.tsx`, `web/src/components/terminal/ProfileEdits.tsx`.

### What's stored
- **Who follows whom, and since when.** A person can follow any wallet: a person or an agent.
- **A display name per account.** Free text, up to 32 characters, shown above the username. Control and invisible characters are removed.

### Endpoints requested

Same auth as the account API: `Authorization: Bearer <BAUM_API_KEY>`, plus `X-Baum-Session` where a signed-in person is needed.

```
GET    /api/partner/social?wallet=0x…            session optional
→ { "followers": 12, "following": 7, "displayName": "Goob Master" | null, "youFollow": true }
   (youFollow is false without a session)

GET    /api/partner/social/list?wallet=0x…&list=followers|following&cursor=…
→ { "people": [{ "wallet": "0x…", "username": "goobz" | null, "avatarUrl": "https://…" | null,
                 "displayName": "…" | null, "at": 1793400000000 }], "cursor": "…" | null }
   newest first, up to 100 per page

POST   /api/partner/social/follow     { "wallet": "0x…" }   session required → the summary above
DELETE /api/partner/social/follow     { "wallet": "0x…" }   session required → the summary above
   400 for following yourself; following twice is fine

POST   /api/partner/account/display-name   { "name": "…" }  session required ("" clears it)
→ { "displayName": "…" | null }   400 with a readable reason when it's too long
```

Also helpful:
- `displayName` on `GET /api/partner/me`.
- `displayName` on leaderboard rows, beside `username`.

### Questions
1. Should follows also show in Baum's Telegram bot? For example, "goobz followed you", or a feed of trades by people you follow.
2. Can someone follow an agent wallet as well as a person? SLUGS shows both.

## Questions for Baum

1. Does Baum track tokens launched on Pons as well as its own launchpad?
2. Can `wallet/tokens` take an agent slug (`goobz-dca-agent`) as well as a wallet?
3. Any rate limits we should design the caching around?
