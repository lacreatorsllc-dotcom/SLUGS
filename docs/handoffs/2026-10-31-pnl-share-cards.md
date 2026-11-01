# PnL cards and in-page Baum chat

The owner supplied three visual references and authorized committing, pushing, and publishing this change. The PnL dialog offers Classic, Spotlight, and Hero layouts, remembers the selected style on this browser, and exports a 1080 × 1080 PNG. The chart action also appears on the signed-in profile when its default wallet has reported 7-day performance.

Cards use the selected range's reported Baum PnL, volume, and trades. Entry price, mark price, return percentage, position direction, and leverage are not in these boards and are not invented. Missing performance prevents sharing instead of generating a zero result.

The agent owner's picture comes from the board. For the signed-in owner's own wallet, capture reads their current Baum profile to use the picture and username they have set, plus their referral code. Another person's performance is never paired with the viewer's avatar. Missing/unavailable pictures use initials. No profile or image is written to a new database.

`POST /api/pnl` captures public market data server-side and returns an HMAC-signed snapshot; browser-supplied financial values are ignored. `GET /api/pnl?card=…&sig=…&style=…&format=image` renders it with resvg and bundled Inter fonts. Only Baum's known HTTPS avatar route can be fetched, with size/type/timeout limits and no redirects. `/share/pnl` serves a public, server-rendered page with Open Graph and X image metadata, without the app's login gate. Both routes reuse `api/data.js`, adding no extra serverless function. Existing data and asset cache policies are preserved.

The signature uses `PNL_SHARE_SECRET` when set, otherwise the existing server-only `BAUM_API_KEY`, with a separate message prefix. Rotating that secret invalidates previously shared URLs. Snapshot numbers stay fixed; their as-of timestamp is printed on the image. The profile picture is loaded from Baum when the image is rendered.

Share on X opens the user's composer with the public card link; it never posts automatically. A PNG download is available for attaching the image itself. X controls how it displays the link preview.

The bottom-right chat action opens the existing in-app panel. Its draft and quick actions stay in SLUGS, with no Telegram links, window opening, clipboard forwarding, or claims that a message was sent. Message sending and copy confirmation are disabled until Baum supplies its chat contract; the partner API request is documented separately.

Verification: tests cover reported-only snapshots, current owner pictures/referrals, public X metadata, tamper rejection, all three actual PNG outputs, avatar URL restrictions, negative PnL/text escaping, and the in-app chat behavior. Run `npm test`, `npm run build`, and ESLint on the changed React files from `web/`.

## Onboarding, deployment suggestions, and preview speed

The owner requested one PnL example on tour card 04, circular profile pictures in every card style, removal of the Goobz introduction on card 01 and the “like goobz/sniper-bot” phrase on card 06, and trading-agent suggestions on `/deploy` without generated names. The tour now uses one Spotlight example and starts with the other example agents; personal invitations retain their chosen profiles. Deploy starts with a blank name and offers DCA, spot, HODL, and stack names alongside any personal invitation suggestions. There is no Shuffle or automatically selected name. The current deploy walkthrough and corner setup chat are preserved; users select tokens, amount, and schedule there.

PnL previews now render the shared SVG artwork directly in the browser from the reported row already on screen. All three styles are available on first render, independent of signing or PNG generation. Sharing is signed in the background and updates the preview to the captured snapshot when ready. Inline SVG gradients, filters, and circular avatar clips have unique IDs for each preview and thumbnail. Names are XML-escaped; preview avatar URLs are restricted to Baum's public avatar route. Server PNG exports retain the native Inter font fix, 1080px output, and signed financial data.

Avatar requests and concurrent exports reuse in-flight work, with bounded caches. This avoids starting FFmpeg or waiting for multiple PNG requests to display a static card. A local benchmark measured about 0.04ms to prepare preview SVG markup versus about 115ms for a full PNG render, excluding network time. UI tests verify that artwork appears before the signing request completes; export tests cover shared fetches, cached PNG reuse, and rendered text.
