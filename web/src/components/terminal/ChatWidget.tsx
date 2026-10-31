import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BAUM, TOKEN } from '../../config'
import { useAuthSession } from '../../lib/auth-context'
import { baumLinks, buyUrl } from '../../lib/baum'
import { useTerminalData } from '../../lib/terminal-context'
import { money, tone } from '../../lib/terminal-format'
import Icon from './Icon'
import { AvatarRing, FloatingCard, IconButton } from './ui'

// Chat with Baum, from the status bar. Baum has no chat API for partners yet
// (docs/handoffs/2026-10-31-baum-chat-request.md), so nothing is answered here: every
// request opens Baum in Telegram, where it can act. Actions with a deep link (launch,
// copy an agent, sign up) open with the request filled in. Anything else typed is
// copied, so it can be pasted into Baum.

type Sent = { text: string; at: number; how: 'link' | 'pasted' }

const BAUM_CHAT = `https://t.me/${BAUM.bot}`
const open = (url: string) => window.open(url, '_blank', 'noopener')

export default function ChatWidget() {
  const [visible, setVisible] = useState(false)
  // Kept while the panel closes or pages change, until the terminal unmounts.
  const [draft, setDraft] = useState('')
  const [sent, setSent] = useState<Sent[]>([])
  return <>
    <IconButton icon="message" label="Chat with Baum" className="t-status-chat" aria-haspopup="dialog" aria-expanded={visible} onClick={() => setVisible(true)} />
    {visible && <ChatPanel draft={draft} onDraft={setDraft} sent={sent} onSent={(item) => setSent((list) => [...list, item])} onClose={() => setVisible(false)} />}
  </>
}

function ChatPanel({ draft, onDraft, sent, onSent, onClose }: { draft: string; onDraft: (value: string) => void; sent: Sent[]; onSent: (item: Sent) => void; onClose: () => void }) {
  const { user, guest } = useAuthSession()
  const { snapshot } = useTerminalData()
  const [copying, setCopying] = useState(false)
  const [pick, setPick] = useState('')
  const [notice, setNotice] = useState('')
  const thread = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight }) }, [sent, copying])

  // Agents to copy: the week's best traders first.
  const agents = useMemo(() => (snapshot?.agents ?? [])
    .filter((agent) => agent.trading['7d'])
    .sort((a, b) => (b.trading['7d']?.pnlUsd ?? 0) - (a.trading['7d']?.pnlUsd ?? 0))
    .slice(0, 50), [snapshot])
  const chosen = agents.find((agent) => agent.id === pick)

  function handOff(text: string, url: string) {
    onSent({ text, at: Date.now(), how: 'link' })
    setNotice('')
    open(url)
  }
  async function send(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    // Telegram can't prefill a bot chat, so the message goes on the clipboard.
    const copied = await navigator.clipboard.writeText(text).then(() => true, () => false)
    onSent({ text, at: Date.now(), how: 'pasted' })
    onDraft('')
    setNotice(copied ? 'Copied. Paste it into Baum in Telegram.' : 'Couldn’t copy it. Select your message in Telegram and type it there.')
    open(BAUM_CHAT)
  }

  const needsAccount = !user
  return <FloatingCard title="Chat with Baum" onClose={onClose} className="t-chat-dialog">
    <div className="t-chat-heading">
      <span className="t-chat-avatar" aria-hidden="true">B</span>
      <div><strong>Baum</strong><span className="t-chat-badge">AGENT</span><p>Your agent desk. Replies and confirmations happen in Telegram.</p></div>
      <a className="t-icon t-icon--outline" href={BAUM_CHAT} target="_blank" rel="noreferrer" aria-label="Open Baum in Telegram" title="Open Baum in Telegram"><Icon name="telegram" /></a>
    </div>

    <div className="t-chat-thread" ref={thread} tabIndex={0} aria-label="Conversation with Baum" aria-live="polite">
      <div className="t-chat-message t-chat-message--baum">
        <p>Hey{user?.username ? ` ${user.username}` : ''}, I’m Baum. I launch and run AI trading agents, copy the best traders, and fund your wallets. Pick something below or type what you want, and we’ll finish it in Telegram.</p>
      </div>
      {sent.map((item) => <div className="t-chat-message t-chat-message--you" key={item.at}>
        <p>{item.text}</p>
        <small>{item.how === 'link' ? 'Opened in Baum on Telegram' : 'Copied for Baum on Telegram'}</small>
      </div>)}
      {copying && <section className="t-chat-card" aria-label="Copy an agent">
        <div className="t-chat-card-heading"><span>COPY AN AGENT</span><IconButton icon="close" label="Close copy an agent" onClick={() => setCopying(false)} /></div>
        <label htmlFor="chat-copy-agent">Agent</label>
        <select id="chat-copy-agent" value={pick} onChange={(event) => setPick(event.target.value)}>
          <option value="">Choose from this week’s board</option>
          {agents.map((agent) => <option key={agent.id} value={agent.id}>{(agent.slug ?? agent.name).replace(/^@/, '')} · {money(agent.trading['7d']?.pnlUsd, true)}</option>)}
        </select>
        {chosen && <div className="t-chat-chosen"><AvatarRing agent={chosen} /><strong>{(chosen.slug ?? chosen.name).replace(/^@/, '')}</strong><span className={tone(chosen.trading['7d']?.pnlUsd)}>{money(chosen.trading['7d']?.pnlUsd, true)} <small>7D</small></span></div>}
        <p className="t-fine">Baum sets up a copy agent for it at $25 a buy. You confirm the limits in Telegram before anything trades.</p>
        <button type="button" className="t-submit" disabled={!chosen} onClick={() => { if (chosen) { handOff(`Copy ${(chosen.slug ?? chosen.name).replace(/^@/, '')}`, baumLinks.copy(chosen.id)); setCopying(false); setPick('') } }}><Icon name="telegram" size={14} />Copy in Baum</button>
      </section>}
    </div>

    {notice && <p className="t-fine t-chat-notice" role="status">{notice}</p>}

    <div className="t-chat-actions" role="group" aria-label="Ask Baum to">
      <button type="button" onClick={() => handOff('Launch an agent', baumLinks.launch())}><Icon name="rocket" size={13} />Launch an agent</button>
      <button type="button" aria-pressed={copying} onClick={() => setCopying(!copying)}><Icon name="trade" size={13} />Copy an agent</button>
      <button type="button" onClick={() => { onDraft('Fund my agent with $20'); input.current?.focus() }}><Icon name="wallet" size={13} />Fund an agent</button>
      <button type="button" onClick={() => handOff(`Buy $${TOKEN.symbol}`, buyUrl())}><Icon name="cart" size={13} />Buy ${TOKEN.symbol}</button>
      {needsAccount && <button type="button" onClick={() => handOff('Make my Baum account', guest ? baumLinks.join(guest.code) : baumLinks.register())}><Icon name="user" size={13} />Make my account</button>}
    </div>

    <form className="t-chat-composer" onSubmit={send}>
      <label className="t-sr-only" htmlFor="chat-message">Message Baum</label>
      <textarea id="chat-message" ref={input} value={draft} rows={2} maxLength={2000} placeholder="Message Baum…"
        onChange={(event) => onDraft(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} />
      <button type="submit" className="t-submit" disabled={!draft.trim()}><Icon name="telegram" size={14} />Send in Telegram</button>
    </form>
    <p className="t-fine t-chat-foot">Baum answers in Telegram for now. Chatting with Baum right here is coming.</p>
  </FloatingCard>
}
