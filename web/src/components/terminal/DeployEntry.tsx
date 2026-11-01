import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthSession } from '../../lib/auth-context'
import { deployHintKey, markDeployHintSeen, shouldShowDeployHint } from '../../lib/deploy-hint'
import Icon from './Icon'

/** An explanation beside the entry point, after the account's welcome tour closes. */
export default function DeployEntry({ welcomeOpen }: { welcomeOpen: boolean }) {
  const { user } = useAuthSession()
  const { pathname } = useLocation()
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const key = deployHintKey(user)
  const visible = key !== dismissedFor && shouldShowDeployHint(user, welcomeOpen, pathname)
  const dismiss = useCallback((restoreFocus = false) => {
    markDeployHintSeen(user)
    setDismissedFor(key)
    if (restoreFocus) ref.current?.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true })
  }, [key, user])
  useEffect(() => {
    if (!visible) return
    const escape = (event: KeyboardEvent) => {
      const activeDialog = document.activeElement?.closest('[role="dialog"]')
      if (event.key === 'Escape' && !document.querySelector('dialog[open]') && (!activeDialog || ref.current?.contains(activeDialog))) dismiss(true)
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [visible, dismiss])
  return <div className={`t-deploy-entry${visible ? ' t-deploy-entry--hint' : ''}`} ref={ref}>
    <Link className="t-top-button t-top-button--primary" to="/deploy" onClick={() => dismiss()} aria-describedby={visible ? `${id}-body` : undefined}>
      <Icon name="plus" size={14} /><span>Deploy a slug</span>
    </Link>
    {visible && <div className="t-deploy-hint" role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} aria-live="polite">
      <div className="t-deploy-hint-head"><strong id={`${id}-title`}>Create your own trading agent</strong><button type="button" aria-label="Dismiss deploy explanation" onClick={() => dismiss(true)}><Icon name="close" size={14} /></button></div>
      <p id={`${id}-body`}>Use “Deploy a slug” to name your agent, then choose its tokens, buy amount and schedule in chat.</p>
      <button type="button" className="t-chip t-chip--go t-deploy-hint-done" onClick={() => dismiss(true)}>Got it</button>
    </div>}
  </div>
}
