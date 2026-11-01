import { useEffect, useId, useRef, type ReactNode } from 'react'
import Icon from './Icon'

/** The same corner chat window for agent setup and the Baum desk. */
export default function AgentChatWindow({ label, title, status, avatar, actions, side = 'left', onClose, children, tour }: {
  label: string; title: ReactNode; status: string; avatar: ReactNode; actions?: ReactNode
  side?: 'left' | 'right'; onClose: () => void; children: ReactNode; tour?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const statusId = useId()
  useEffect(() => {
    const panel = ref.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panel?.querySelector<HTMLElement>('[data-chat-input]')?.focus({ preventScroll: true })
    return () => {
      if (previousFocus?.isConnected && (panel?.contains(document.activeElement) || document.activeElement === document.body)) previousFocus.focus({ preventScroll: true })
    }
  }, [])
  return <section ref={ref} className={`t-deploy-chat${side === 'right' ? ' t-baum-chat' : ''}`} role="dialog" aria-modal="false" aria-label={label} aria-describedby={statusId} data-tour={tour}
    onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }}>
    <header className="t-deploy-chat-head">
      {avatar}
      <span className="t-deploy-chat-who"><span className="t-mono">{title}</span><small id={statusId}>{status}</small></span>
      {actions}
      <button type="button" className="t-deploy-chat-close" onClick={onClose} aria-label={`Close ${label}`}><Icon name="close" size={14} /></button>
    </header>
    {children}
  </section>
}
