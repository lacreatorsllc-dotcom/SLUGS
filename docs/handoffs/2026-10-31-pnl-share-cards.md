# PnL cards and in-page Baum chat

The owner supplied three visual references and authorized committing, pushing, and publishing this change. The PnL dialog offers Classic, Spotlight, and Hero layouts, remembers the selected style on this browser, and exports a 1080 × 1080 PNG. The chart action also appears on the signed-in profile when its default wallet has reported 7-day performance.

Cards use the selected range's reported Baum PnL, volume, and trades. Entry price, mark price, return percentage, position direction, and leverage are not in these boards and are not invented. Missing performance prevents sharing instead of generating a zero result.

The agent owner's picture comes from the board. For the signed-in owner's own wallet, capture reads their current Baum profile to use the picture and username they have set, plus their referral code. Another person's performance is never paired with the viewer's avatar. Missing/unavailable pictures use initials. No profile or image is written to a new database.

`POST /api/pnl` captures public market data server-side and returns an HMAC-signed snapshot; browser-supplied financial values are ignored. `GET /api/pnl?card=…&sig=…&style=…&format=image` renders it with resvg and bundled Inter fonts. Only Baum's known HTTPS avatar route can be fetched, with size/type/timeout limits and no redirects. `/share/pnl` serves a public, server-rendered page with Open Graph and X image metadata, without the app's login gate. Both routes reuse `api/data.js`, adding no extra serverless function. Existing data and asset cache policies are preserved.

The signature uses `PNL_SHARE_SECRET` when set, otherwise the existing server-only `BAUM_API_KEY`, with a separate message prefix. Rotating that secret invalidates previously shared URLs. Snapshot numbers stay fixed; their as-of timestamp is printed on the image. The profile picture is loaded from Baum when the image is rendered.

Share on X opens the user's composer with the public card link; it never posts automatically. A PNG download is available for attaching the image itself. X controls how it displays the link preview.

The bottom-right chat action opens the existing in-app panel. Its draft and quick actions stay in SLUGS, with no Telegram links, window opening, clipboard forwarding, or claims that a message was sent. Message sending and copy confirmation are disabled until Baum supplies its chat contract; the partner API request is documented separately.

Verification: tests cover reported-only snapshots, current owner pictures/referrals, public X metadata, tamper rejection, all three actual PNG outputs, avatar URL restrictions, negative PnL/text escaping, and the in-app chat behavior. Run `npm test`, `npm run build`, and ESLint on the changed React files from `web/`.
