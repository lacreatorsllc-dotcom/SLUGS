// The invitation card: 1200 × 630, the size X and Telegram show as a link preview.
// This is a placeholder layout until the owner's design arrives. Everything it shows
// comes from the invitation: their name, the note, who it's from, the suggested bots
// and the invite code. Swap the SVG below for the final design; the fields stay the same.

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])
const text = (x, y, value, size, fill = '#f5f3ee', weight = 400, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${extra}>${escape(value)}</text>`

/** Splits a note into at most two lines of about `width` characters. */
export function noteLines(note, width = 52) {
  const words = String(note ?? '').split(' ').filter(Boolean)
  const lines = ['']
  for (const word of words) {
    const line = lines[lines.length - 1]
    if ((line + ' ' + word).trim().length <= width) lines[lines.length - 1] = (line + ' ' + word).trim()
    else if (lines.length < 2) lines.push(word)
    else { lines[1] = `${lines[1].slice(0, width - 1)}…`; break }
  }
  return lines.filter(Boolean)
}

export function renderInvitationCard(invitation, { logo } = {}) {
  const rings = Array.from({ length: 26 }, (_, i) => `<ellipse cx="1180" cy="315" rx="${90 + i * 30}" ry="${84 + i * 30}" fill="none" stroke="#a2553b" stroke-width="2" opacity=".32"/>`).join('')
  const brand = logo ? `<image href="${escape(logo)}" x="64" y="52" width="300" height="90" preserveAspectRatio="xMinYMid meet"/>` : text(64, 120, 'SLUGS', 72, '#f8622e', 700)
  const name = [...invitation.to].length > 22 ? `${[...invitation.to].slice(0, 21).join('')}…` : invitation.to
  const note = noteLines(invitation.note)
  let x = 64
  const bots = invitation.bots.map((bot) => {
    const width = 26 + bot.length * 15
    if (x + width > 1136) return ''
    const chip = `<rect x="${x}" y="462" width="${width}" height="48" rx="12" fill="#140d0a" stroke="#6b3a24" stroke-width="2"/>${text(x + 14, 494, bot, 24, '#e8e4dc', 500)}`
    x += width + 12
    return chip
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><radialGradient id="bg"><stop stop-color="#1c211c"/><stop offset="1" stop-color="#080b0a"/></radialGradient></defs>
<rect width="1200" height="630" fill="url(#bg)"/>${rings}
<g font-family="Inter">
${brand}
${text(64, 232, 'You’re invited,', 40, '#b8b5ad')}
${text(64, 318, `${name}.`, 82, '#f5f3ee', 700)}
${note.map((line, i) => text(64, 372 + i * 34, line, 26, '#9a978f')).join('')}
${invitation.bots.length ? text(64, 448, 'BOTS TO TRY', 18, '#85827a', 700, 'letter-spacing="3"') : ''}${bots}
${text(64, 574, `from ${invitation.from}`, 26, '#f8622e', 700)}
${text(1136, 574, `slugs.run · code ${invitation.code.toUpperCase()}`, 24, '#b8b5ad', 400, 'text-anchor="end"')}
</g></svg>`
}
