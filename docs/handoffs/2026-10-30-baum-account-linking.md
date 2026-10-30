# Connecting a Baum account to a SLUGS account

The "supported Baum account-linking flow" asked for in `2026-10-30-baum-terminal-implementation.md`. Baum's side is Stable-Finance/baum-monorepo#376. Until that deploys, none of the endpoints below exist.

**Update (PR #27):** Baum is the login, not something connected to a Firebase login. A SLUGS account is a Baum account; anything SLUGS-only (display name, follows, chat) gets stored later, keyed to the Baum account. Firebase is gone from `web/`. Every Baum account lives in Telegram, so that is where people log in.

## Flow (built: `web/api/session.js`, `web/src/pages/Login.tsx`, `web/src/pages/ConnectBaum.tsx`)

1. `/login` has one button, **Log in with Baum**: `baumLinks.login()`, which is `https://t.me/<VITE_BAUM_BOT>?start=atp-login-MINT-FLASH-38`.
2. Baum replies in Telegram with a **Sign in** button to `https://www.slugs.run/connect-baum?code=<one-time code>`. The code works once, for 10 minutes. Someone Baum hasn't let in yet gets the invite-apply message instead and no button.
3. `/connect-baum` is public. It posts the code to `POST /api/session`, which trades it for a Baum session:

   ```
   POST https://baumai.xyz/api/partner/session
   Authorization: Bearer <BAUM_API_KEY>
   { "code": "<code>" }
   → 200 { "session": "<token>", "profile": Profile }
   → 400 bad-code · 410 expired-code (used or older than 10 minutes) · 401 bad key
   ```

   The session goes into the `slugs_session` cookie (httpOnly, Secure, SameSite=Lax, 30 days), so page scripts never see it or the key.
4. `GET /api/session` returns the profile (Baum's `GET /api/partner/me` with `X-Baum-Session`), or 401 when signed out. `useAuthSession().user` is that profile; `RequireAuth` gates the terminal on it.
5. `DELETE /api/session` signs out (Baum's `DELETE /api/partner/session`) and clears the cookie.

An invite code on `/` is a Baum referral code: Continue opens Baum with `ref-<CODE>`, which lets the person straight in, then they log in as above.

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
