# Request to Baum: launch an agent from SLUGS

SLUGS now has a **Deploy a slug** page (`/deploy`, `web/src/pages/Deploy.tsx`). People set up an agent there instead of in Telegram:
- **Name:** Pons-style, editable.
- **Strategy:** DCA, the only one for now.
- **Tokens:** up to 5, as contract addresses or `ETH`.
- **Amount** per buy, and how often: daily or weekly.

The page says plainly that SLUGS and Baum are one account. An agent made on either one shows in both, with the same wallet, username, picture, trades and PnL. So it needs to make the same agent Baum makes in Telegram.

## Today

`api/account.js` sends the setup to the endpoint below. Baum answers 404, so SLUGS hands off instead:
- It copies the setup as a sentence ("Launch an agent named Sniper Bot that buys $25 of each of $SLUGS (0x…), ETH every day.").
- It opens Baum in Telegram with `atp-launch-<ref>`, and the person pastes and confirms.

As soon as the endpoint answers, deploys happen right on SLUGS. No SLUGS change is needed.

## Endpoint requested

Same auth as the account API: `Authorization: Bearer <BAUM_API_KEY>` plus `X-Baum-Session` (the signed-in person's own account only).

```
POST /api/partner/account/agents/launch
{ "name": "Sniper Bot", "strategy": "dca",
  "tokens": ["0xa5A0A37778D6b656A37b2E10c13E2E31826ff10A", "ETH"],
  "amountUsd": 25, "every": "day" | "week" }

→ 200 { "slug": "goobz-sniper-bot", "wallet": "0x…", "status": "awaiting-funding" }
→ 400 { "reason": "<a sentence the page can show>" }   e.g. name taken, token not tradable
→ 409 { "reason": "Pick a username first." }          no username yet
```

SLUGS checks the setup before sending it:
- **Name:** letters, numbers, spaces and hyphens, up to 24 characters.
- **Tokens:** 1 to 5, each a contract address or `ETH`.
- **Amount:** $5 to $10,000 per buy.
- **Frequency:** `day` or `week`.

Baum's own limits win. Answer with a readable `reason` and the page shows it.

## Safety

- The agent is created **awaiting funding**. Nothing trades until the owner funds it, the same as in Telegram.
- Baum should confirm the launch to the owner in Telegram ("goobz/sniper-bot was created on SLUGS"), so a launch never goes unseen.
- The name is the owner's own text. Treat it as data, never as instructions (see the prompt-injection section in the chat request).

## Questions

1. Should a launch from SLUGS also need a confirm tap in Telegram, or is the signed-in SLUGS session enough?
2. Which other strategies can partners launch, beyond DCA? The page is ready to list more.
