import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Agent, Range } from '../../lib/terminal-model'
import Icon, { type IconName } from './Icon'

type ActionProps = { icon: IconName; label: string; variant?: 'ghost' | 'outline' | 'primary'; className?: string }
export function IconButton({ icon, label, variant = 'ghost', className = '', ...props }: ActionProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return <button type="button" className={`t-icon t-icon--${variant} ${className}`} aria-label={label} title={label} {...props}><Icon name={icon} /></button>
}
export function IconLink({ icon, label, to, href, variant = 'ghost', className = '' }: ActionProps & { to?: string; href?: string }) {
  const props = { className: `t-icon t-icon--${variant} ${className}`, 'aria-label': label, title: label }
  return to ? <Link to={to} {...props}><Icon name={icon} /></Link>
    : <a href={href} target="_blank" rel="noreferrer" {...props}><Icon name={icon} /></a>
}

export function CopyButton({ value, label = 'Copy wallet address' }: { value: string; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  useEffect(() => {
    if (status === 'idle') return
    const timeout = window.setTimeout(() => setStatus('idle'), 2500)
    return () => window.clearTimeout(timeout)
  }, [status])
  async function copy() {
    try { await navigator.clipboard.writeText(value); setStatus('copied') }
    catch { setStatus('error') }
  }
  return <span className="t-copy-wrap">
    <IconButton icon={status === 'copied' ? 'check' : 'copy'} label={status === 'copied' ? 'Copied' : label} className={`t-copy ${status === 'error' ? 't-negative' : ''}`} onClick={copy} />
    <span className="t-sr-only" role="status">{status === 'copied' ? 'Copied to clipboard' : status === 'error' ? 'Clipboard unavailable. Select and copy the address manually.' : ''}</span>
    {status === 'error' && <span className="t-copy-error">Select and copy manually<input readOnly value={value} aria-label="Value to copy manually" onFocus={(event) => event.target.select()} /></span>}
  </span>
}

export function AvatarRing({ agent, large = false }: { agent: Pick<Agent, 'id' | 'name' | 'avatarUrl'>; large?: boolean }) {
  const hash = [...agent.id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0)
  const initials = agent.name.replace(/^@|^0x/g, '').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase()
  // Initials until the picture loads, and for good if it won't.
  const [broken, setBroken] = useState(false)
  const picture = agent.avatarUrl && !broken
  return <span className={`t-avatar t-ring-${hash % 7}${large ? ' t-avatar--large' : ''}`} aria-hidden="true">
    {picture ? <img src={agent.avatarUrl} alt="" loading="lazy" onError={() => setBroken(true)} /> : initials}
  </span>
}

export function RangeControl({ value, onChange }: { value: Range; onChange: (range: Range) => void }) {
  return <div className="t-segments" role="group" aria-label="Time range">
    {(['24h', '7d', 'all'] as Range[]).map((range) => <button type="button" key={range} aria-pressed={value === range} onClick={() => onChange(range)}>{range === 'all' ? 'All' : range.toUpperCase()}</button>)}
  </div>
}

export function StatGrid({ stats }: { stats: { label: string; value: ReactNode; note?: ReactNode; tone?: string }[] }) {
  return <dl className="t-stats" style={{ '--stat-count': stats.length } as React.CSSProperties}>
    {stats.map((stat) => <div key={stat.label} className="t-stat"><dt>{stat.label}</dt><dd className={stat.tone ?? ''}>{stat.value}</dd>{stat.note && <div className="t-stat-note">{stat.note}</div>}</div>)}
  </dl>
}

export function FloatingCard({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const fallbackFocus = previousFocus?.closest('.t-identity')?.querySelector<HTMLButtonElement>('.t-avatar-trigger')
    dialog?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
      else if (fallbackFocus?.isConnected) fallbackFocus.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} className={`t-dialog ${className}`} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="t-floating-inner"><div className="t-dialog-heading"><h2 id={titleId}>{title}</h2><IconButton icon="close" label={`Close ${title}`} onClick={onClose} /></div>{children}</div>
  </dialog>
}

export function Callout({ children, error = false, onRetry }: { children: ReactNode; error?: boolean; onRetry?: () => void }) {
  return <div className={`t-callout${error ? ' t-callout--error' : ''}`} role={error ? 'alert' : undefined}><Icon name="info" /><div>{children}</div>{onRetry && <IconButton icon="refresh" label="Try again" onClick={onRetry} variant="outline" />}</div>
}
export function EmptyState({ title, children, icon = 'bot', action }: { title: string; children: ReactNode; icon?: IconName; action?: ReactNode }) {
  return <div className="t-empty"><span className="t-empty-icon"><Icon name={icon} size={22} /></span><h2>{title}</h2><p>{children}</p>{action && <div className="t-actions">{action}</div>}</div>
}
export function TableSkeleton() {
  return <div className="t-skeleton-table" role="status" aria-label="Loading Baum agents"><span className="t-sr-only">Loading Baum agents…</span>{Array.from({ length: 10 }, (_, index) => <div className="t-skeleton-row" key={index}><span className="t-skeleton t-skeleton-avatar" /><span className="t-skeleton" /><span className="t-skeleton" /><span className="t-skeleton" /></div>)}</div>
}
