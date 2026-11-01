import { useEffect, useState } from 'react'
import { rangeLabel, type Agent, type Range } from '../../lib/terminal-model'
import Icon from './Icon'
import { Callout, CopyButton, IconLink } from './ui'
import './pnl.css'

const styles = [{ id: 'classic', name: 'Classic' }, { id: 'spotlight', name: 'Spotlight' }, { id: 'hero', name: 'Hero' }] as const
type Style = typeof styles[number]['id']
type Capture = { card: string; sig: string; snapshot: { name: string; pnlUsd: number; updatedAt: number; avatarUrl: string | null } }
function preferredStyle(): Style {
  try { const saved = localStorage.getItem('slugs.pnl.style'); if (styles.some((style) => style.id === saved)) return saved as Style } catch { /* Storage may be unavailable. */ }
  return 'classic'
}

export default function PnlCard({ agent, range }: { agent: Agent; range: Range }) {
  const [style, setStyle] = useState<Style>(preferredStyle)
  const [capture, setCapture] = useState<Capture | null>(null)
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [thumbsReady, setThumbsReady] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setCapture(null); setError(''); setLoaded(false); setThumbsReady(false); setImageError(false)
    fetch(`${import.meta.env.BASE_URL}api/pnl`, {
      method: 'POST', credentials: 'same-origin', signal: controller.signal,
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet: agent.id, range }),
    }).then(async (response) => {
      const value = await response.json()
      if (!response.ok) throw new Error(value.reason || 'Couldn’t prepare your card.')
      if (typeof value.card !== 'string' || typeof value.sig !== 'string' || !value.snapshot) throw new Error('Couldn’t prepare your card.')
      if (!controller.signal.aborted) setCapture(value)
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Couldn’t prepare your card. Try again.') })
    return () => controller.abort()
  }, [agent.id, range, revision])
  function choose(next: Style) {
    if (next === style) return
    setStyle(next); setLoaded(false); setImageError(false)
    try { localStorage.setItem('slugs.pnl.style', next) } catch { /* The choice still works for this visit. */ }
  }
  const query = capture ? new URLSearchParams({ card: capture.card, sig: capture.sig, style }) : null
  const imageUrl = (choice: Style, size?: number) => `${import.meta.env.BASE_URL}api/pnl?${new URLSearchParams({ card: capture?.card ?? '', sig: capture?.sig ?? '', style: choice, format: 'image', v: '2', ...(size ? { size: String(size) } : {}) })}`
  const shareUrl = query ? `${location.origin}${import.meta.env.BASE_URL}share/pnl?${query}` : ''
  const amount = capture ? `${capture.snapshot.pnlUsd >= 0 ? '+' : '−'}$${Math.abs(capture.snapshot.pnlUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
  const twitter = `https://twitter.com/intent/tweet?${new URLSearchParams({ text: `${capture?.snapshot.name ?? agent.name} · ${rangeLabel(range)} PnL ${amount} on @slugsrun`, url: shareUrl })}`
  return <div className="t-pnl-studio">
    {error ? <Callout error onRetry={() => setRevision((value) => value + 1)}>{error}</Callout> : <>
      <div className="t-pnl-preview" aria-busy={!loaded && !imageError}>
        {(!capture || !loaded) && !imageError && <div className="t-pnl-loading t-skeleton" role="status"><Icon name="chart" size={28} /><span>Preparing your PnL card…</span></div>}
        {capture && !imageError && <img key={`${capture.sig}-${style}`} src={imageUrl(style, 540)} width="1080" height="1080" alt={`${capture.snapshot.name}, ${rangeLabel(range)} PnL ${amount}, ${style} card`} onLoad={() => { setLoaded(true); setThumbsReady(true) }} onError={() => { setImageError(true); setLoaded(false) }} />}
        {imageError && <Callout error onRetry={() => setRevision((value) => value + 1)}>Couldn’t render the card. Try again.</Callout>}
      </div>
      <div className="t-pnl-templates" role="group" aria-label="PnL card style">
        {styles.map((choice) => <button type="button" key={choice.id} aria-pressed={style === choice.id} onClick={() => choose(choice.id)} disabled={!capture}>
          {capture && thumbsReady ? <img src={imageUrl(choice.id, 240)} width="1080" height="1080" alt="" loading="lazy" /> : <span className="t-skeleton" />}<span>{choice.name}{style === choice.id && <Icon name="check" size={13} />}</span>
        </button>)}
      </div>
      {capture && <div className="t-pnl-share-actions">
        <a className={`t-submit${!loaded || imageError ? ' t-pnl-unready' : ''}`} href={loaded && !imageError ? twitter : undefined} target="_blank" rel="noreferrer" aria-disabled={!loaded || imageError}><Icon name="x" size={16} />Share on X</a>
        <a className={`t-submit t-submit--secondary${!loaded || imageError ? ' t-pnl-unready' : ''}`} href={loaded && !imageError ? `${imageUrl(style)}&download=1` : undefined} download={`slugs-pnl-${style}-${range}.png`} aria-disabled={!loaded || imageError}><Icon name="download" size={16} />Download PNG</a>
        <CopyButton value={shareUrl} label="Copy PnL card link" />
      </div>}
      <p className="t-fine">Share a link with your card preview on X, or download the PNG to attach it to a post.</p>
      {capture && <p className="t-fine">Reported PnL, volume and trades · snapshot {new Date(capture.snapshot.updatedAt).toLocaleString()}. {capture.snapshot.avatarUrl ? 'Uses the profile picture set on Baum.' : <>Add your picture in <IconLink icon="settings" label="Open profile picture settings" to="/settings" /> Settings to personalize your cards.</>}</p>}
    </>}
  </div>
}
