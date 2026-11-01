// The three owner-supplied references, rendered with reported Baum data only.
export const STYLES = ['classic', 'spotlight', 'hero']
export const escapeXml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character])
const text = (x, y, value, size = 32, fill = '#f5f3ee', weight = 400, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${extra}>${escapeXml(value)}</text>`
const money = (value, signed = false) => `${signed ? value >= 0 ? '+' : '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const clipName = (name, max = 30) => [...name].slice(0, max).join('')

export function renderPnlCard(card, style, assets = {}) {
  const prefix = /^[a-z][a-z0-9-]{0,80}$/i.test(assets.prefix ?? '') ? assets.prefix : 'pnl'
  // Inline previews share a document; keep every gradient, filter and avatar clip local.
  return cardMarkup(card, style, assets)
    .replace(/id="(bg|glow|portrait)"/g, `id="${prefix}-$1"`)
    .replace(/url\(#(bg|glow|portrait)\)/g, `url(#${prefix}-$1)`)
}

function cardMarkup(card, style, { logo, avatar } = {}) {
  if (!STYLES.includes(style)) throw new Error('Unknown PnL style')
  const color = card.pnlUsd >= 0 ? '#37d773' : '#f87171'
  const amount = money(card.pnlUsd, true)
  const amountSize = Math.min(154, Math.floor(1470 / Math.max(amount.length, 8)))
  const name = clipName(card.name)
  const range = card.range === 'all' ? 'ALL TIME' : card.range.toUpperCase()
  const initials = card.name.replace(/^@|^0x/g, '').slice(0, 2).toUpperCase()
  const date = new Date(card.updatedAt).toISOString().slice(0, 10)
  const rings = Array.from({ length: 34 }, (_, index) => `<ellipse cx="1160" cy="540" rx="${110 + index * 31}" ry="${100 + index * 34}" fill="none" stroke="${style === 'classic' ? '#a2553b' : '#55564a'}" stroke-width="2" opacity="${style === 'classic' ? '.38' : '.25'}"/>`).join('')
  const picture = ({ x, y, size }) => avatar
    ? `<image href="${escapeXml(avatar)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait)"/>`
    : `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="#151716" stroke="#33382f"/>${text(x + size / 2, y + size / 2 + 38, initials, 110, '#f8622e', 700, 'text-anchor="middle"')}`
  const brand = (x, y, width = 430) => logo ? `<image href="${escapeXml(logo)}" x="${x}" y="${y}" width="${width}" height="128" preserveAspectRatio="xMinYMid meet"/>` : text(x, y + 95, 'SLUGS', 96, '#f8622e', 700)
  const footer = text(54, 1048, `${range} · SNAPSHOT ${date} · SLUGS.RUN`, 18, '#91978f')
  const pill = (x, y) => `<rect x="${x}" y="${y - 38}" width="165" height="54" rx="14" fill="#154b2c"/>${text(x + 82, y, `${range} PNL`, 25, '#67e38d', 700, 'text-anchor="middle"')}`
  let content
  let portrait
  if (style === 'classic') {
    portrait = { x: 720, y: 51, size: 306 }
    content = `${brand(65, 63)}${picture(portrait)}
      <rect x="49" y="382" width="982" height="452" rx="24" fill="#151615" stroke="#b66a4e" stroke-width="3"/>
      ${text(75, 555, amount, amountSize, color, 700)}${text(994, 623, `${name} · ${range}`, 32, '#a0b49f', 400, 'text-anchor="end"')}
      <path d="M49 662h982M347 662v172M651 662v172" stroke="#ad664c" stroke-width="2"/>
      ${text(79, 717, 'Volume', 33, '#a9ada6')}${text(79, 789, money(card.volumeUsd), 39, '#f5f3ee', 700)}
      ${text(380, 717, 'Trades', 33, '#a9ada6')}${text(380, 789, card.trades.toLocaleString('en-US'), 42, '#f5f3ee', 700)}
      ${text(688, 717, 'Referral code', 30, '#a9ada6')}${text(688, 789, card.ref, Math.min(37, 440 / Math.max(card.ref.length, 12) * 1.5), '#f5f3ee', 700)}
      <rect x="65" y="868" width="950" height="143" rx="24" fill="#141615" stroke="#e58458" stroke-width="4" filter="url(#glow)"/>
      ${text(140, 958, 'Track this agent on', 38)}${brand(573, 882, 360)}`
  } else if (style === 'spotlight') {
    portrait = { x: 665, y: 597.5, size: 360 }
    content = `${brand(53, 40, 320)}${text(53, 266, name, 50)}${pill(53, 326)}
      ${text(48, 500, amount, amountSize, color, 700)}${text(53, 590, `${range} PERFORMANCE`, 40, '#57c471')}
      ${text(53, 695, 'Volume', 34, '#999f96')}${text(53, 760, money(card.volumeUsd), 45, '#f5f3ee', 700)}
      ${text(53, 850, 'Trades', 34, '#999f96')}${text(53, 915, card.trades.toLocaleString('en-US'), 45, '#f5f3ee', 700)}
      ${picture(portrait)}${text(1025, 1010, `REF ${card.ref}`, 22, '#a8afa5', 400, 'text-anchor="end"')}`
  } else {
    portrait = { x: 387, y: 592, size: 306 }
    content = `${brand(340, 58, 400)}${text(540, 319, name, 47, '#e8794f', 400, 'text-anchor="middle"')}
      ${pill(458, 384)}${text(540, 521, amount, amountSize, '#565951', 700, 'text-anchor="middle" opacity=".55"')}
      ${text(540, 585, amount, amountSize, '#ffffff', 700, 'text-anchor="middle"')}
      ${picture(portrait)}${text(540, 653, `${range} PNL`, 34, '#65dc83', 700, 'text-anchor="middle"')}
      ${text(80, 745, 'Volume', 29, '#a3aaa1')}${text(80, 803, money(card.volumeUsd), 37, '#f5f3ee', 700)}
      ${text(1000, 745, 'Trades', 29, '#a3aaa1', 400, 'text-anchor="end"')}${text(1000, 803, card.trades.toLocaleString('en-US'), 40, '#f5f3ee', 700, 'text-anchor="end"')}
      <rect x="165" y="914" width="750" height="92" rx="46" fill="#181c18" stroke="#9f5d43" stroke-width="3"/>
      ${text(540, 973, 'Track this agent on SLUGS', 38, '#ed9266', 700, 'text-anchor="middle"')}`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1080" viewBox="0 0 1080 1080"><defs><radialGradient id="bg"><stop stop-color="#1c211c"/><stop offset="1" stop-color="#080b0a"/></radialGradient><filter id="glow" x="-15%" y="-60%" width="130%" height="220%"><feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur"/><feFlood flood-color="#e47d4f" flood-opacity=".25"/><feComposite in2="blur" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="portrait"><circle cx="${portrait.x + portrait.size / 2}" cy="${portrait.y + portrait.size / 2}" r="${portrait.size / 2}"/></clipPath></defs><rect width="1080" height="1080" fill="url(#bg)"/>${rings}<g font-family="Inter" font-variant-numeric="tabular-nums">${content}${footer}</g></svg>`
}
