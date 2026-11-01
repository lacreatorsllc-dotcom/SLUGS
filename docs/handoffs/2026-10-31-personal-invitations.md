# Personal invitations

The owner makes an invite link for one person on **/admin → Personal invitations**. Each invite can include:
- **Who:** their name, optional @handle, and a note.
- **From:** who it's from, and the invite code (their account counts for that code).
- **Bots:** up to 4 suggestions.
- **Profiles:** up to 8, the people their welcome tour shows.

## How it works

- **The link.** `api/admin.js` (`action: 'invitation'`) checks the caller is a Baum admin, cleans the input and signs it (`server/invitation.js`). The link is `https://www.slugs.run/i/<payload>.<signature>`.
  - Everything rides in the link. There's no database.
  - The signature uses `INVITE_SECRET`, falling back to `BAUM_API_KEY`. Rotating it voids old links.
- **The card.** `/i/<token>` (through `api/data.js` → `server/invitation-api.js`) serves a page whose link preview is the invitation card, then forwards to `/<code>?inv=<token>`.
  - The card itself: `/api/invitation?token=…&format=image`, 1200 × 630 PNG.
- **The invite page.** `src/pages/InviteLink.tsx` checks the token, greets them by name with the note and bots, takes the usual guest pass, and keeps the invitation in the browser (`src/lib/invitation.ts`).
  - **Welcome tour, card 01:** shows their chosen profiles. The first appears alone, then the rest rotate.
  - **Last card's examples:** start with the suggested bots.
  - **Deploy page:** starts on the first suggested bot, with the others as one-tap picks.

## Swapping in the owner's card design

The card is drawn in **`web/server/invitation-card.js` → `renderInvitationCard(invitation, { logo })`**, as an SVG rendered to PNG with the Inter fonts in `server-assets/`.

Fields available:

| Field | Example |
|---|---|
| `to` | Alex |
| `handle` | alex_1 (optional) |
| `note` | up to 160 characters (optional) |
| `from` | goobz |
| `code` | GOOBZ |
| `bots` | up to 4, like `dca-bot` |
| `profiles` | `[{ u, a, w? }]` |

- Keep the 1200 × 630 size; it's what X and Telegram preview.
- Images need to be data URIs or files in `server-assets/`. The renderer doesn't fetch the web.
- Escape any text that goes into the SVG.
