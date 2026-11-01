import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import handler, { renderPnlImage } from '../server/pnl-api.js'
import { renderPnlCard, STYLES } from '../server/pnl-card.js'

const originalSecret = process.env.PNL_SHARE_SECRET
process.env.PNL_SHARE_SECRET = 'local-pnl-test-key'
after(() => { if (originalSecret === undefined) delete process.env.PNL_SHARE_SECRET; else process.env.PNL_SHARE_SECRET = originalSecret })
const wallet = `0x${'a'.repeat(40)}`
const board = { rows: [{ wallet, username: 'alice', pnlUsd: 12.5, volumeUsd: 250, trades: 4 }], updatedAt: 1793400000000 }
function response() {
  return {
    statusCode: 0, headers: {} as Record<string, string>, body: undefined as any,
    status(code: number) { this.statusCode = code; return this },
    setHeader(key: string, value: string) { this.headers[key] = value },
    json(body: unknown) { this.body = body; return this }, send(body: unknown) { this.body = body; return this }, end() { return this },
  }
}
async function capture() {
  const res = response()
  await handler({ method: 'POST', headers: {}, body: { wallet, range: '7d', pnlUsd: 9000000 }, query: {} }, res)
  return res
}

test('share snapshots use reported performance rather than values supplied by the browser', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => board }))
  const res = await capture()
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.snapshot.pnlUsd, 12.5)
  assert.equal(res.body.snapshot.volumeUsd, 250)
  assert.equal(res.body.snapshot.trades, 4)
  assert.match(res.body.sig, /^[a-f0-9]{64}$/)
  assert.equal(res.headers['cache-control'], 'private, no-store')
})

test('an unavailable agent is not given a fabricated zero-PnL share card', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ rows: [] }) }))
  const res = await capture()
  assert.equal(res.statusCode, 404)
  assert.equal(res.body.card, undefined)
})

test('the owner’s current Baum picture and invite replace a stale board profile', async (context) => {
  const originalKey = process.env.BAUM_API_KEY
  process.env.BAUM_API_KEY = 'test-partner-key'
  try {
    context.mock.method(globalThis, 'fetch', async (url) => ({ ok: true, json: async () => String(url).endsWith('/me')
      ? { wallets: [wallet], username: 'new-name', avatarUrl: `https://baumai.xyz/api/avatar/${wallet}?v=latest`, invites: [{ code: 'MINT-REAL', aliases: ['ALICE'] }] }
      : board }))
    const res = response()
    await handler({ method: 'POST', headers: { cookie: 'slugs_session=test-session' }, body: { wallet, range: '7d' }, query: {} }, res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.snapshot.avatarUrl, `https://baumai.xyz/api/avatar/${wallet}?v=latest`)
    assert.equal(res.body.snapshot.name, '@new-name')
    assert.equal(res.body.snapshot.ref, 'ALICE')
  } finally { if (originalKey === undefined) delete process.env.BAUM_API_KEY; else process.env.BAUM_API_KEY = originalKey }
})

test('public card pages expose X image metadata without requiring a login', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => board }))
  const { card, sig } = (await capture()).body
  const res = response()
  await handler({ method: 'GET', query: { card, sig, style: 'hero' }, headers: {} }, res)
  assert.equal(res.statusCode, 200)
  assert.match(res.body, /name="twitter:card" content="summary_large_image"/)
  assert.match(res.body, /property="og:image"/)
  assert.match(res.body, /format=image/)
  assert.doesNotMatch(res.body, /connect-baum|api\/session/)
})

test('editing a shared PnL amount invalidates the signature', async (context) => {
  const mock = context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => board }))
  const { card, sig } = (await capture()).body
  const tampered = JSON.parse(Buffer.from(card, 'base64url').toString())
  tampered.pnlUsd = 999999
  const res = response()
  await handler({ method: 'GET', headers: {}, query: { card: Buffer.from(JSON.stringify(tampered)).toString('base64url'), sig, format: 'image' } }, res)
  assert.equal(res.statusCode, 400)
  assert.equal(mock.mock.callCount(), 1)
})

test('all three designs produce distinct, downloadable 1080px PNGs', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => board }))
  const { card, sig } = (await capture()).body
  const images: Buffer[] = []
  for (const style of STYLES) {
    const res = response()
    await handler({ method: 'GET', headers: {}, query: { card, sig, style, format: 'image', download: '1' } }, res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.headers['content-type'], 'image/png')
    assert.match(res.headers['content-disposition'], /^attachment;/)
    const png = Buffer.from(res.body)
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(png.readUInt32BE(16), 1080)
    assert.equal(png.readUInt32BE(20), 1080)
    images.push(png)
  }
  assert.notDeepEqual(images[0], images[1])
  assert.notDeepEqual(images[1], images[2])
})

test('the native renderer draws the PnL text with its bundled Inter font', async () => {
  const rendered = await renderPnlImage({ wallet, name: '@alice', pnlUsd: 1250, volumeUsd: 250, trades: 4, range: '7d', ref: 'SLUGS', updatedAt: board.updatedAt, avatarUrl: null }, 'classic')
  const pixels = rendered.pixels
  let green = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 1] > 120 && pixels[i + 1] > pixels[i] * 1.5 && pixels[i + 1] > pixels[i + 2] * 1.3 && pixels[i + 3] > 128) green++
  }
  assert.ok(green > 10000, `The PnL text must be drawn, found ${green} green pixels`)
})

test('an avatar cannot make the renderer fetch a private or arbitrary URL', async (context) => {
  const mock = context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ ...board, rows: [{ ...board.rows[0], avatarUrl: 'http://169.254.169.254/latest/meta-data/' }] }) }))
  const { card, sig } = (await capture()).body
  const res = response()
  await handler({ method: 'GET', headers: {}, query: { card, sig, format: 'image' } }, res)
  assert.equal(res.statusCode, 200)
  assert.equal(mock.mock.callCount(), 1)
})

test('card text is escaped and losses use the negative color without invented leverage', () => {
  const svg = renderPnlCard({ wallet, name: '<script>bad</script>', pnlUsd: -12.5, volumeUsd: 250, trades: 4, range: '7d', ref: 'SLUGS', updatedAt: board.updatedAt }, 'classic')
  assert.match(svg, /&lt;script&gt;/)
  assert.match(svg, /#f87171/)
  assert.match(svg, /−\$12\.50/)
  assert.doesNotMatch(svg, /<script>|LONG 20X|Entry Price|Mark Price/)
})
