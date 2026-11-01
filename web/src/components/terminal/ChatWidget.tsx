import { useMemo, useRef, useState } from 'react'
import { BRAND, TOKEN } from '../../config'
import { useTerminalData } from '../../lib/terminal-context'
import { money, tone } from '../../lib/terminal-format'
import Icon from './Icon'
import AgentChatWindow from './AgentChatWindow'
import { AvatarRing, IconButton } from './ui'

// The chat stays inside SLUGS. Baum has not supplied a web-chat contract yet;
// drafts are never presented as sent messages or forwarded to another service.
export default function ChatWidget() {
  const [visible, setVisible] = useState(false)
  const [draft, setDraft] = useState('')
  return <>
    <IconButton icon="message" label="Chat with Baum" className="t-status-chat" aria-haspopup="dialog" aria-expanded={visible} onClick={() => setVisible((value) => !value)} />
    {visible && <ChatPanel draft={draft} onDraft={setDraft} onClose={() => setVisible(false)} />}
  </>
}

export function ChatPanel({ draft, onDraft, onClose }: { draft: string; onDraft: (value: string) => void; onClose: () => void }) {
  const { snapshot, loading, error, refresh } = useTerminalData()
  const [copying, setCopying] = useState(false)
  const [pick, setPick] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)
  const agents = useMemo(() => (snapshot?.agents ?? [])
    .filter((agent) => agent.trading['7d'])
    .sort((a, b) => (b.trading['7d']?.pnlUsd ?? 0) - (a.trading['7d']?.pnlUsd ?? 0))
    .slice(0, 50), [snapshot])
  const chosen = agents.find((agent) => agent.id === pick)
  function prepare(text: string) { onDraft(text); input.current?.focus() }
  return <AgentChatWindow label="Chat with Baum" title="Chat with Baum" status="Web replies coming soon" side="right" onClose={onClose}
    avatar={<span className="t-deploy-chat-face" aria-hidden="true">B</span>}
    actions={<a className="t-chip" href={BRAND.telegram} target="_blank" rel="noreferrer">SLUGS community</a>}>
    <div className="t-deploy-chat-thread" tabIndex={0} aria-label="Conversation with Baum">
      <p className="t-deploy-msg t-deploy-msg--bot">Hey, I’m Baum. Prepare a request below. In-app replies and trade confirmations are coming soon; nothing will be sent yet.</p>
      {copying && <section className="t-chat-card" aria-label="Copy trade draft">
        <div className="t-chat-card-heading"><span>COPY TRADE · DRAFT</span><IconButton icon="close" label="Close copy trade draft" onClick={() => setCopying(false)} /></div>
        {loading ? <p role="status">Loading agents…</p> : error || snapshot?.boardError ? <div><p>Couldn’t load agents.</p><IconButton icon="refresh" label="Reload agents" onClick={refresh} /></div> : agents.length === 0 ? <p>No agents have reported performance for this range.</p> : <>
          <label htmlFor="chat-copy-agent">Agent</label>
          <select id="chat-copy-agent" value={pick} onChange={(event) => { setPick(event.target.value); const agent = agents.find((item) => item.id === event.target.value); if (agent) onDraft(`Copy ${agent.name}`) }}>
            <option value="">Choose from this week’s board</option>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{(agent.slug ?? agent.name).replace(/^@/, '')} · {money(agent.trading['7d']?.pnlUsd, true)}</option>)}
          </select>
          {chosen && <div className="t-chat-chosen"><AvatarRing agent={chosen} /><strong>{(chosen.slug ?? chosen.name).replace(/^@/, '')}</strong><span className={tone(chosen.trading['7d']?.pnlUsd)}>{money(chosen.trading['7d']?.pnlUsd, true)} <small>7D</small></span></div>}
        </>}
        <button type="button" className="t-submit" disabled><Icon name="check" size={14} />Confirm copy trade · coming soon</button>
        <p className="t-fine">Draft only. Nothing has been sent or signed.</p>
      </section>}
    </div>
    <footer className="t-deploy-chat-foot">
      <div className="t-deploy-replies" role="group" aria-label="Prepare a request">
        <button type="button" className="t-chip" onClick={() => prepare('Help me launch an agent')}><Icon name="rocket" size={13} />Launch an agent</button>
        <button type="button" className="t-chip" aria-pressed={copying} onClick={() => { setCopying(!copying); prepare('Help me copy an agent') }}><Icon name="trade" size={13} />Copy an agent</button>
        <button type="button" className="t-chip" onClick={() => prepare('Help me fund my agent')}><Icon name="wallet" size={13} />Fund an agent</button>
        <button type="button" className="t-chip" onClick={() => prepare(`How can I buy $${TOKEN.symbol}?`)}><Icon name="cart" size={13} />Buy ${TOKEN.symbol}</button>
      </div>
      <form className="t-deploy-chat-input" onSubmit={(event) => event.preventDefault()}>
        <label className="t-sr-only" htmlFor="chat-message">Message Baum</label>
        <textarea id="chat-message" data-chat-input ref={input} value={draft} rows={1} maxLength={2000} placeholder="Message Baum…" aria-describedby="chat-send-note" onChange={(event) => onDraft(event.target.value)} />
        <button type="submit" className="t-chip" disabled>Send</button>
      </form>
      <p id="chat-send-note" className="t-fine t-chat-foot">Your draft stays here when you close the panel. Sending is not available yet.</p>
    </footer>
  </AgentChatWindow>
}
