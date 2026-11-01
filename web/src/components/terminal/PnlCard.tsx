import { useEffect, useId, useState } from 'react'
import { renderPnlCard } from '../../../server/pnl-card.js'
import { useAuthSession } from '../../lib/auth-context'
import { useTerminalData } from '../../lib/terminal-context'
import { avatarForCard, pnlPreview, type PnlPreview } from '../../lib/pnl-preview'
import { rangeLabel, type Agent, type Range } from '../../lib/terminal-model'
import Icon from './Icon'
import { Callout, CopyButton } from './ui'
import './pnl.css'

const styles = [{ id: 'classic', name: 'Classic' }, { id: 'spotlight', name: 'Spotlight' }, { id: 'hero', name: 'Hero' }] as const
type Style = typeof styles[number]['id']
type Capture = { card: string; sig: string; snapshot: PnlPreview }
function preferredStyle(): Style {
  try { const saved = localStorage.getItem('slugs.pnl.style'); if (styles.some((style) => style.id === saved)) return saved as Style } catch { /* Storage may be unavailable. */ }
  return 'classic'
}

export default function PnlCard({ agent, range }: { agent: Agent; range: Range }) {
  const id = useId().replace(/[^a-z0-9-]/gi, '')
  const { user } = useAuthSession()
  const { snapshot } = useTerminalData()
  const [style, setStyle] = useState<Style>(preferredStyle)
  const [capture, setCapture] = useState<Capture | null>(null)
  const [error, setError] = useState('')
  const [brokenAvatar, setBrokenAvatar] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setCapture(null); setError('')
    // Signing runs in the background. The preview never waits for a network render.
    fetch(`${import.meta.env.BASE_URL}api/pnl`, {
      method: 'POST', credentials: 'same-origin', signal: controller.signal,
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet: agent.id, range }),
    }).then(async (response) => {
      const value = await response.json().catch(() => null)
      if (!response.ok) throw new Error(value?.reason || 'Couldn’t prepare sharing. Try again.')
      if (typeof value?.card !== 'string' || typeof value?.sig !== 'string' || !value.snapshot
        || ![value.snapshot.pnlUsd, value.snapshot.volumeUsd, value.snapshot.trades, value.snapshot.updatedAt].every(Number.isFinite)) throw new Error('Couldn’t prepare sharing. Try again.')
      if (!controller.signal.aborted) setCapture(value)
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Couldn’t prepare sharing. Try again.') })
    return () => controller.abort()
  }, [agent.id, range, revision, user?.avatarUrl, user?.username])
  function choose(next: Style) {
    setStyle(next)
    try { localStorage.setItem('slugs.pnl.style', next) } catch { /* The choice still works for this visit. */ }
  }
  const preview = capture?.snapshot ?? pnlPreview(agent, range, snapshot?.traders[range]?.updatedAt, user)
  const avatar = preview?.avatarUrl === brokenAvatar ? undefined : avatarForCard(preview?.avatarUrl)
  const artwork = (choice: Style, size: 'main' | 'thumb') => preview ? renderPnlCard(preview, choice, {
    logo: `${import.meta.env.BASE_URL}slugs-logo-orange.png`, avatar, prefix: `pnl-${id}-${size}-${choice}`,
  }) : ''
  const query = capture ? new URLSearchParams({ card: capture.card, sig: capture.sig, style }) : null
  const imageUrl = capture ? `${import.meta.env.BASE_URL}api/pnl?${query}&format=image&v=3&download=1` : undefined
  const shareUrl = query ? `${location.origin}${import.meta.env.BASE_URL}share/pnl?${query}` : ''
  const amount = preview ? `${preview.pnlUsd >= 0 ? '+' : '−'}$${Math.abs(preview.pnlUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
  const twitter = capture ? `https://twitter.com/intent/tweet?${new URLSearchParams({ text: `${preview?.name ?? agent.name} · ${rangeLabel(range)} PnL ${amount} on @slugsrun`, url: shareUrl })}` : undefined
  return <div className="t-pnl-studio" onErrorCapture={(event) => {
    const target = event.target as Element
    if (preview?.avatarUrl && target.tagName.toLowerCase() === 'image' && target.getAttribute('href') === preview.avatarUrl) setBrokenAvatar(preview.avatarUrl)
  }}>
    {preview ? <div className="t-pnl-preview" role="img" aria-label={`${preview.name}, ${rangeLabel(range)} PnL ${amount}, ${style} card`} dangerouslySetInnerHTML={{ __html: artwork(style, 'main') }} />
      : <Callout>No trading performance is reported for this agent and time range.</Callout>}
    <div className="t-pnl-templates" role="group" aria-label="PnL card style">
      {styles.map((choice) => <button type="button" key={choice.id} aria-pressed={style === choice.id} onClick={() => choose(choice.id)} disabled={!preview}>
        <span className="t-pnl-thumb" aria-hidden="true" dangerouslySetInnerHTML={{ __html: artwork(choice.id, 'thumb') }} /><span>{choice.name}{style === choice.id && <Icon name="check" size={13} />}</span>
      </button>)}
    </div>
    {error && <Callout error onRetry={() => setRevision((value) => value + 1)}>{error}</Callout>}
    <div className="t-pnl-share-actions">
      <a className={`t-submit${!capture ? ' t-pnl-unready' : ''}`} href={twitter} target="_blank" rel="noreferrer" aria-disabled={!capture} tabIndex={capture ? 0 : -1}><Icon name="x" size={16} />Share on X</a>
      <a className={`t-submit t-submit--secondary${!capture ? ' t-pnl-unready' : ''}`} href={imageUrl} download={`slugs-pnl-${style}-${range}.png`} aria-disabled={!capture} tabIndex={capture ? 0 : -1}><Icon name="download" size={16} />Download PNG</a>
      {capture && <CopyButton value={shareUrl} label="Copy PnL card link" />}
    </div>
    {!capture && !error && <p className="t-fine" role="status">Preparing sharing options…</p>}
    <p className="t-fine">Share a link with your card preview on X, or download the PNG to attach it to a post.</p>
    {preview && <p className="t-fine">Reported PnL, volume and trades · snapshot {new Date(preview.updatedAt).toLocaleString()}. {preview.avatarUrl ? 'Uses the profile picture set on Baum.' : 'Add your picture in Settings to personalize your cards.'}</p>}
  </div>
}
