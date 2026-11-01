// Renders the three PnL card styles with example numbers and goobz's Baum picture, for
// the welcome tour's Share your PnL card. Run from web/:
//   node scripts/render-welcome-pnl.mjs /tmp/out
// then shrink each to a 400px JPEG (sips -s format jpeg -Z 400) into public/welcome/.
import { readFile, writeFile } from 'node:fs/promises'
import { Resvg } from '@resvg/resvg-js'
import { renderPnlCard, STYLES } from '../server/pnl-card.js'
const out = process.argv[2]
const [regular, bold, logo] = await Promise.all(['Inter-Regular.ttf', 'Inter-Bold.ttf', 'slugs-logo-orange.png'].map((f) => readFile(`server-assets/${f}`)))
const res = await fetch('https://baumai.xyz/api/avatar/0xf6414c58f65b106232871c0d566c417054ef6b92')
const avatar = `data:${res.headers.get('content-type')};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
const card = { name: 'goobz/sniper-bot', wallet: '0xf6414c58f65b106232871c0d566c417054ef6b92', range: '7d', pnlUsd: 1245.5, volumeUsd: 4812.3, trades: 17, ref: 'GOOBZ', updatedAt: Date.UTC(2026, 9, 31), avatarUrl: null }
for (const style of STYLES) {
  const svg = renderPnlCard(card, style, { logo: `data:image/png;base64,${logo.toString('base64')}`, avatar })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 540 }, font: { fontBuffers: [regular, bold], loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng()
  await writeFile(`${out}/pnl-${style}.png`, png)
  console.log(style, png.length)
}
