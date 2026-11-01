// Serves personal invitations (server/invitation.js), through api/data.js so it adds no
// serverless function:
//
//   /i/<token>                       a page with the card as its link preview, which
//                                    sends people on to /<code>?inv=<token>
//   /api/invitation?token=…          the invitation, once its signature checks out
//   /api/invitation?token=…&format=image[&download=1]   the card as a PNG

import { readFile } from 'node:fs/promises'
import { Resvg } from '@resvg/resvg-js'
import { invitationIn, linkFor, SITE } from './invitation.js'
import { renderInvitationCard } from './invitation-card.js'

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

let resources
const assets = () => (resources ??= Promise.all(['Inter-Regular.ttf', 'Inter-Bold.ttf', 'slugs-logo-orange.png'].map((file) => readFile(new URL(`../server-assets/${file}`, import.meta.url)))))

export async function cardPng(invitation) {
  const [regular, bold, logo] = await assets()
  const svg = renderInvitationCard(invitation, { logo: `data:image/png;base64,${logo.toString('base64')}` })
  return new Resvg(svg, { font: { fontBuffers: [regular, bold], loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng()
}

export default async function handler(req, res) {
  const token = String(req.query.token ?? '')
  const invitation = invitationIn(token)
  if (!invitation) {
    res.setHeader('cache-control', 'no-store')
    if (req.query.invitation === 'page') return res.status(404).send('<!doctype html><meta charset="utf-8"><title>Invite not found · SLUGS</title><p>This invite link isn’t valid. <a href="/">Enter an invite code</a>.</p>')
    return res.status(404).json({ reason: 'This invite link isn’t valid.' })
  }
  try {
    if (req.query.format === 'image') {
      res.setHeader('content-type', 'image/png')
      res.setHeader('cache-control', 'public, max-age=86400, s-maxage=604800, immutable')
      res.setHeader('content-disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="slugs-invite-${invitation.to.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png"`)
      return res.status(200).send(await cardPng(invitation))
    }
    if (req.query.invitation === 'page') {
      const image = `${SITE}/api/invitation?token=${token}&format=image`
      const next = `/${encodeURIComponent(invitation.code)}?inv=${token}`
      const title = `${invitation.to}, you’re invited to SLUGS`
      const description = invitation.note || `${invitation.from} invited you to SLUGS: AI trading agents, followed and tracked.`
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.setHeader('cache-control', 'public, max-age=300, s-maxage=86400')
      return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${escape(linkFor(token))}">
<meta property="og:image" content="${escape(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@slugsrun"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(image)}">
<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${escape(next)}">
<style>body{margin:0;background:#0b0b0a;color:#f5f3ee;font:16px system-ui,sans-serif;display:flex;min-height:100dvh;align-items:center;justify-content:center}a{color:#f8622e}</style></head>
<body><p>Opening your invite… <a href="${escape(next)}">Continue</a></p></body></html>`)
    }
    res.setHeader('cache-control', 'private, no-store')
    return res.status(200).json({ invitation })
  } catch (error) {
    console.warn('invitation:', error?.message)
    return res.status(502).json({ reason: 'Couldn’t open this invite. Try again.' })
  }
}
