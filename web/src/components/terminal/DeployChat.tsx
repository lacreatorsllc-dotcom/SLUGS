import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { TOKEN } from '../../config'
import { call, reasonText } from '../../lib/account'
import { baumLinks } from '../../lib/baum'
import { MAX_TOKENS, MIN_BUY_USD, perMonthUsd, setupMessage, setupProblem, type Every, type Setup, type TokenPick } from '../../lib/deploy'
import { money } from '../../lib/terminal-format'
import { shortAddress } from '../../lib/terminal-model'
import Icon from './Icon'

// Setting up a slug by chat, from the Deploy page's bottom-left corner. The agent the
// person just named asks what to buy, how much and how often, then deploys it through
// api/account.js. It's a guided setup with fixed questions, not an AI: Baum has no chat
// API for partners yet. Until Baum's launch endpoint answers, the finished setup is
// handed to Baum in Telegram instead (copied, then pasted there).

type Stage = 'tokens' | 'amount' | 'every' | 'review' | 'deploying' | 'done' | 'handoff'
type Line = { who: 'bot' | 'you'; text: string }

const TOKENS: TokenPick[] = [{ address: TOKEN.address, symbol: TOKEN.symbol }, { address: 'ETH', symbol: 'ETH' }]
const AMOUNTS = [10, 25, 50, 100]
const CONTRACT = /^0x[0-9a-fA-F]{40}$/
const label = (token: TokenPick) => (token.address === 'ETH' ? 'ETH' : token.symbol.startsWith('0x') ? token.symbol : `$${token.symbol}`)

export default function DeployChat({ username, name, picture, onClose }: { username: string; name: string; picture?: string | null; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('tokens')
  const [tokens, setTokens] = useState<TokenPick[]>([])
  const [amount, setAmount] = useState(0)
  const [every, setEvery] = useState<Every>('day')
  const [lines, setLines] = useState<Line[]>([{ who: 'bot', text: `Hey, I’m ${name}. I buy tokens for you on a schedule, once you fund me. What should I buy? Pick a few, or paste a token’s contract.` }])
  const [draft, setDraft] = useState('')
  const [result, setResult] = useState<{ path: string } | null>(null)
  const thread = useRef<HTMLDivElement>(null)
  useEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' }) }, [lines, stage])

  const say = (...next: Line[]) => setLines((list) => [...list, ...next])
  const setup: Setup = { name, tokens, amountUsd: amount, every }
  const slug = `${username}/${name}`

  function toggle(token: TokenPick) {
    setTokens((list) => (list.some((item) => item.address === token.address) ? list.filter((item) => item.address !== token.address) : list.length >= MAX_TOKENS ? list : [...list, token]))
  }
  function doneTokens() {
    if (!tokens.length) return
    say({ who: 'you', text: tokens.map(label).join(' and ') }, { who: 'bot', text: 'Got it. How much each time?' })
    setStage('amount')
  }
  function pickAmount(value: number) {
    if (!Number.isFinite(value) || value < MIN_BUY_USD) return say({ who: 'bot', text: `Each buy needs to be at least $${MIN_BUY_USD}.` })
    setAmount(value)
    say({ who: 'you', text: `${money(value).replace(/\.00$/, '')} each time` }, { who: 'bot', text: 'And how often?' })
    setStage('every')
  }
  function pickEvery(value: Every) {
    setEvery(value)
    say({ who: 'you', text: value === 'day' ? 'Every day' : 'Every week' }, { who: 'bot', text: 'Here’s the plan. Deploy me when it looks right.' })
    setStage('review')
  }
  function startOver() {
    setTokens([]); setAmount(0)
    say({ who: 'you', text: 'Change something' }, { who: 'bot', text: 'Sure. What should I buy?' })
    setStage('tokens')
  }

  async function deploy() {
    const problem = setupProblem(setup)
    if (problem) return say({ who: 'bot', text: problem })
    setStage('deploying')
    const r = await call({ action: 'launch-agent', name, tokens: tokens.map((token) => token.address), amountUsd: amount, every })
    const json = r.json as { reason?: string; slug?: string; wallet?: string }
    if (r.ok) {
      setResult({ path: `/agents/${json.slug ?? json.wallet ?? ''}` })
      say({ who: 'bot', text: `Done. I’m live and waiting for funds. Fund me and I start buying. I show in Telegram too.` })
      return setStage('done')
    }
    if (json.reason === 'pending') {
      // Baum hasn't opened deploying to partners yet: finish this same setup in Telegram.
      const copied = await navigator.clipboard.writeText(setupMessage(setup)).then(() => true, () => false)
      window.open(baumLinks.launch(), '_blank', 'noopener')
      say({ who: 'bot', text: copied
        ? 'Deploying straight from SLUGS turns on soon. For now Baum just opened in Telegram and my setup is copied: paste it there and confirm. I show up here as soon as I’m made.'
        : 'Deploying straight from SLUGS turns on soon. Baum just opened in Telegram: tell it this setup and confirm. I show up here as soon as I’m made.' })
      return setStage('handoff')
    }
    say({ who: 'bot', text: reasonText(json) })
    setStage('review')
  }

  function send(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    setDraft('')
    if (!text) return
    if (stage === 'tokens') {
      if (CONTRACT.test(text)) {
        if (!tokens.some((token) => token.address.toLowerCase() === text.toLowerCase())) toggle({ address: text, symbol: shortAddress(text) })
        return
      }
      const known = TOKENS.find((token) => label(token).toLowerCase() === text.toLowerCase() || token.symbol.toLowerCase() === text.replace(/^\$/, '').toLowerCase())
      if (known) { if (!tokens.includes(known)) toggle(known); return }
      return say({ who: 'you', text }, { who: 'bot', text: 'I can buy $SLUGS or ETH, or any token if you paste its contract address (0x and 40 characters).' })
    }
    if (stage === 'amount') return pickAmount(Number(text.replace(/[$,\s]/g, '')))
    if (stage === 'every') {
      if (/day|daily/i.test(text)) return pickEvery('day')
      if (/week/i.test(text)) return pickEvery('week')
      return say({ who: 'you', text }, { who: 'bot', text: 'Every day or every week?' })
    }
  }

  const typing = stage === 'tokens' || stage === 'amount' || stage === 'every'
  return <section className="t-deploy-chat" role="dialog" aria-label={`Set up ${slug}`} data-tour="deploy-chat">
    <header className="t-deploy-chat-head">
      {picture ? <img src={picture} alt="" /> : <span className="t-deploy-chat-face">{username.slice(0, 2).toUpperCase()}</span>}
      <span className="t-deploy-chat-who"><span className="t-mono">{username}<span className="t-welcome-slug-agent">/{name}</span></span><small>{stage === 'done' ? 'Live' : stage === 'handoff' ? 'Finishing in Telegram' : `Setting up · step ${stage === 'tokens' ? 1 : stage === 'amount' ? 2 : 3} of 3`}</small></span>
      <a className="t-chip" href={baumLinks.launch()} target="_blank" rel="noreferrer">Telegram instead</a>
      <button type="button" className="t-deploy-chat-close" onClick={onClose} aria-label="Close setup chat"><Icon name="close" size={14} /></button>
    </header>
    <div className="t-deploy-chat-thread" ref={thread} aria-live="polite">
      {lines.map((line, i) => <p key={i} className={`t-deploy-msg t-deploy-msg--${line.who}`}>{line.text}</p>)}
      {(stage === 'review' || stage === 'deploying') && <div className="t-deploy-plan">
        <span className="t-deploy-plan-label">READY TO DEPLOY</span>
        <span className="t-mono">{username}<span className="t-welcome-slug-agent">/{name}</span></span>
        <span>Buys {money(amount).replace(/\.00$/, '')} of {tokens.map(label).join(' and ')} every {every}</span>
        <small>About {money(perMonthUsd(setup)).replace(/\.00$/, '')} a month · trades only after you fund it, and can lose money</small>
      </div>}
      {stage === 'done' && result && <div className="t-deploy-plan t-deploy-plan--live"><span>● {slug} is live</span><small>Fund its wallet from its page to start.</small></div>}
    </div>
    <footer className="t-deploy-chat-foot">
      <div className="t-deploy-replies">
        {stage === 'tokens' && <>
          {[...TOKENS, ...tokens.filter((token) => !TOKENS.some((item) => item.address === token.address))].map((token) => {
            const on = tokens.some((item) => item.address === token.address)
            return <button type="button" key={token.address} className="t-chip" aria-pressed={on} onClick={() => toggle(token)}>{on && <Icon name="check" size={12} />}{label(token)}</button>
          })}
          <button type="button" className="t-chip t-chip--go" onClick={doneTokens} disabled={!tokens.length}>Done</button>
        </>}
        {stage === 'amount' && AMOUNTS.map((value) => <button type="button" key={value} className="t-chip" onClick={() => pickAmount(value)}>${value}</button>)}
        {stage === 'every' && <><button type="button" className="t-chip" onClick={() => pickEvery('day')}>Every day</button><button type="button" className="t-chip" onClick={() => pickEvery('week')}>Every week</button></>}
        {stage === 'review' && <><button type="button" className="t-chip t-chip--go" onClick={deploy}><Icon name="rocket" size={12} />Deploy {slug}</button><button type="button" className="t-chip" onClick={startOver}>Change something</button></>}
        {stage === 'deploying' && <span className="t-fine" role="status">Deploying…</span>}
        {stage === 'done' && result && <Link className="t-chip t-chip--go" to={result.path}>Open its page</Link>}
        {stage === 'handoff' && <a className="t-chip t-chip--go" href={baumLinks.launch()} target="_blank" rel="noreferrer"><Icon name="telegram" size={12} />Open Baum again</a>}
      </div>
      {typing && <form className="t-deploy-chat-input" onSubmit={send}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="Reply"
          placeholder={stage === 'tokens' ? 'Or paste a contract (0x…)' : stage === 'amount' ? 'Or type an amount' : 'Daily or weekly?'} />
        <button type="submit" className="t-chip" disabled={!draft.trim()}>Send</button>
      </form>}
    </footer>
  </section>
}
