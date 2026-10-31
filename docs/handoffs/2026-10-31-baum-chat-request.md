# Request to Baum: chat with Baum inside SLUGS

SLUGS has a **Chat with Baum** panel (status bar → message icon, `web/src/components/terminal/ChatWidget.tsx`). The owner requested that it stay in SLUGS. Drafts and quick actions stay in the panel; sending and confirmations are disabled while Baum's web-chat contract is unavailable. There is no Telegram or clipboard handoff.

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
