# Request to Baum: chat with Baum inside SLUGS

SLUGS has a **Chat with Baum** panel (status bar → message icon, `web/src/components/terminal/ChatWidget.tsx`). Baum has no partner chat API today: `/api/partner/chat` and similar paths answer 404. So the panel hands everything to Baum in Telegram:

- **Deep links:** launch an agent, copy an agent, and make an account, through the existing `atp-*` / `slug-join-*` start payloads.
- **Anything typed:** copied to the clipboard and Baum opened in Telegram, because Telegram can't prefill a bot chat.

## What we'd like from Baum

Same auth as the account API: `Authorization: Bearer <BAUM_API_KEY>` plus `X-Baum-Session`.

```
POST /api/partner/chat
{ "message": "copy goobz-dca with $25 a buy" }
→ 200 {
    "reply": "…",                       // Baum's answer, plain text or light markdown
    "actions": [                         // optional: things the person confirms
      { "id": "act_…", "kind": "copy" | "launch" | "fund" | "swap",
        "summary": "Copy goobz-dca at $25 a buy, max $100 a day",
        "confirmUrl": "https://t.me/<bot>?start=…" }   // or a confirm endpoint below
    ]
  }

GET  /api/partner/chat/history?cursor=   → { "messages": [{ "from": "you" | "baum", "text", "at", "actions"? }], "next" }
POST /api/partner/chat/actions/:id/confirm   → 200 { "status": "done" | "pending", "tx"? }
```

## Questions for Baum

1. Should SLUGS's chat and the person's Telegram chat with Baum be the same conversation, so history shows in both?
2. Which actions can be confirmed in SLUGS, and which must stay in Telegram?
3. Rate limits and credits: does a chat message cost SLUGS's Baum credits?
