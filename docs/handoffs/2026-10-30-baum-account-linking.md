# Connecting a Baum account to a SLUGS account

The "supported Baum account-linking flow" asked for in `2026-10-30-baum-terminal-implementation.md`. Baum's side is Stable-Finance/baum-monorepo#376. Until that deploys, none of the endpoints below exist.

A SLUGS account stays the Firebase login. Connecting Baum adds the person's Baum agents, strategy and copy agent to it. Every Baum account lives in Telegram, so that is where the person proves it is theirs.

## Flow

1. A signed-in SLUGS user presses **Connect Baum** (Settings or Profile). It opens `https://t.me/<VITE_BAUM_BOT>?start=atp-login-MINT-FLASH-38`.
2. Baum replies in Telegram with a **Sign in** button to `https://www.slugs.run/connect-baum?code=<one-time code>`. The code works once, for 10 minutes. Someone Baum hasn't let in yet gets the invite-apply message instead and no button.
3. `/connect-baum` is a signed-in route. If the browser Telegram opened isn't signed in to SLUGS, log in first and keep `code` through the redirect. Then the page sends the code and the user's Firebase ID token to a SLUGS server function.
4. That function verifies the ID token (Firebase Admin), then trades the code for a Baum session:

   ```
   POST https://baumai.xyz/api/partner/session
   Authorization: Bearer <BAUM_API_KEY>
   { "code": "<code>" }
   → 200 { "session": "<token>", "profile": Profile }
   → 400 bad-code · 410 expired-code (used or older than 10 minutes) · 401 bad key
   ```

   Store `session` server-side only, against the Firebase uid (not in `users/{uid}`, which signed-in users can read). It lasts 30 days and only works with SLUGS' key.
5. Reading the profile later:

   ```
   GET https://baumai.xyz/api/partner/me
   Authorization: Bearer <BAUM_API_KEY>
   X-Baum-Session: <token>
   → 200 Profile · 401 signed-out (ended, expired, or another partner's session): show Connect Baum again
   ```

6. Disconnecting: `DELETE https://baumai.xyz/api/partner/session` with the same two headers, then forget the token.

These calls are free. They don't spend SLUGS' Baum credits.

## Profile

```ts
type Profile = {
  username: string | null
  wallets: string[]            // EVM wallets Baum holds for them, lower case, default first; match against Agent.id
  strategy: { id: string; name: string } | null   // declared with /agent strategy
  copy: {
    status: 'draft' | 'active' | 'paused'
    sources: { label: string; ref: string; sizing: string }[]   // ref like agent:0x…; sizing like "$25 per buy"
    perTradeUsd: number
    dailyUsd: number
  } | null
}
```

Everything is changed in Baum (`/agent strategy`, `/copy`). The site only shows it.

## Copy on Baum

`baumLinks.copy(wallet)` (`atp-copy-<wallet>-CODE`) now sets up a draft copy agent for that wallet at $25 a buy and shows the plan with Confirm. Nothing trades until the person confirms. After that, Baum copies the wallet's buys and sells within the limits by itself.
