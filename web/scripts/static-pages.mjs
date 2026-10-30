// Writes a real HTML file for every route and every listed agent, each a copy of the
// built index.html with its own title, description and share-card tags. Link previews
// (X, Telegram, Discord) don't run JavaScript, so without this every link shares as
// the home page; it also turns the SPA's 404-with-app answers into 200s.
//
//   SITE_URL=https://slugs.run/ DATA_URL=https://.../ node scripts/static-pages.mjs dist
//
// Runs after fetch-leaderboard.mjs, so agent pages exist for whoever is on the board.

import { mkdir, readFile, writeFile } from 'node:fs/promises'

const out = process.argv[2] ?? 'dist'
const site = (process.env.SITE_URL || 'https://www.slugs.run/').replace(/\/?$/, '/')
const symbol = process.env.VITE_TOKEN_SYMBOL || 'SLUGS'
const template = await readFile(`${out}/index.html`, 'utf8')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const money = (n) => `${n < 0 ? '−' : '+'}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

function page(path, title, description) {
  const url = site + path
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="SLUGS" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(site)}og.png" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
  ].join('\n    ')
  return template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${tags}\n  </head>`)
}

async function write(path, html) {
  const dir = path ? `${out}/${path}` : out
  await mkdir(dir, { recursive: true })
  await writeFile(`${dir}/index.html`, html)
}

const routes = [
  ['', 'SLUGS — Invite only', 'SLUGS is invite only. Enter your invite code, or enter the raffle: shill us on X or burn the token.'],
  ['login', 'Login · SLUGS', 'Log in to SLUGS with your Baum account.'],
  ['home', 'Leaderboard · SLUGS', 'Trading agents on Baum ranked by PnL. Compare strategies, view vaults, and boost your slug.'],
  ['leaderboard', 'Leaderboard · SLUGS', 'Trading agents on Baum ranked by PnL over 24h, 7d and all time.'],
  ['agents', 'Browse agents · SLUGS', 'Browse trading agents on Baum by category. Boosted agents first.'],
  ['agents/compare', 'Compare agents · SLUGS', 'Compare Baum agents side by side by profit, volume, trades and strategy.'],
  ['vaults', 'Vaults · SLUGS', 'Back a trading strategy through its vault. Operators set their own performance fee.'],
  ['swap', 'Swap · SLUGS', `Trade ${symbol}, BAUM and ETH on Robinhood Chain.`],
  ['burn', 'Skip the line · SLUGS', 'Burn 3,000,000 SLUGS and link the wallet on Baum to get into SLUGS without a referral.'],
  ['token', `$${symbol} · SLUGS`, `The platform token: burn ${symbol} to boost an agent; platform fees buy it back.`],
]
for (const [path, title, description] of routes) await write(path, page(path, title, description))

// One page per agent on the board, from the boards fetch-leaderboard.mjs just wrote.
// On Vercel there are no data files in the build (api/data.js serves them), so the
// boards are read from DATA_URL instead: the live site, or the fallback it reads.
const dataUrl = process.env.DATA_URL || 'https://gumdropsteve.github.io/agent-trading-platform/'
const board = async (name) =>
  JSON.parse(
    await readFile(`${out}/data/${name}.json`, 'utf8').catch(async () =>
      dataUrl ? await fetch(new URL(`data/${name}.json`, dataUrl)).then((r) => (r.ok ? r.text() : '{"rows":[]}')).catch(() => '{"rows":[]}') : '{"rows":[]}',
    ),
  ).rows
const [week, all] = await Promise.all([board('leaderboard-7d'), board('leaderboard-all')])
const weekly = new Map(week.map((r) => [r.wallet, r]))
for (const row of all) {
  const name = row.username ? `@${row.username}` : `${row.wallet.slice(0, 6)}…${row.wallet.slice(-4)}`
  const w = weekly.get(row.wallet)
  const description =
    `${w ? `${money(w.pnlUsd)} this week, ` : ''}${money(row.pnlUsd)} all time on $${Math.round(row.volumeUsd).toLocaleString('en-US')} volume ` +
    `across ${row.trades} trades. Copy this agent on Baum.`
  await write(`agents/${row.wallet}`, page(`agents/${row.wallet}`, `${name} · SLUGS`, description))
}
// LP-only wallets (the Yield category) get a page too, described by their LP stats.
const lps = await board('lps-all').catch(() => [])
const traders = new Set(all.map((r) => r.wallet.toLowerCase()))
let lpPages = 0
for (const row of lps) {
  if (traders.has(row.wallet.toLowerCase())) continue
  const name = row.username ? `@${row.username}` : `${row.wallet.slice(0, 6)}…${row.wallet.slice(-4)}`
  const description =
    `${money(row.feesUsd)} in LP fees on $${Math.round(row.liquidityUsd).toLocaleString('en-US')} of liquidity` +
    `${row.pools?.length ? ` in ${row.pools.slice(0, 3).join(', ')}` : ''}. Yield on SLUGS.`
  await write(`agents/${row.wallet}`, page(`agents/${row.wallet}`, `${name} · SLUGS`, description))
  lpPages++
}
console.log(`pages: ${routes.length} routes, ${all.length} agents, ${lpPages} LP-only agents`)
