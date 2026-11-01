import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BAUM } from '../config'
import { baumLinks } from '../lib/baum'
import Icon, { type IconName } from '../components/terminal/Icon'

// What a paper trade strategy is and how to start one on Baum, step by step.
// Telegram can't prefill a message to Baum, so each step's message copies to the
// clipboard (as Deploy does) and the person pastes it in the chat.
//
// The facts here are Baum's (baum-monorepo lib/paper-view.ts, lib/paper-access-view.ts):
// starting money of $1k / $10k (default) / $100k / $1M, up to 10 paper accounts, fills at
// real prices with fees and network costs taken off, ranked against holding BTC, and the
// PAPER code for paper-only access.

const STEPS: { title: string; body: string; say?: string[]; note?: string }[] = [
  {
    title: 'Open Baum in Telegram',
    body: 'Baum is the trading assistant SLUGS is built on. Your SLUGS and Baum accounts are the same account.',
    note: 'New to Baum? It’s invite only. The button below brings SLUGS’ invite with it.',
  },
  {
    title: 'Start a paper account',
    body: 'Pick how much pretend money to start with: $1,000, $10,000, $100,000 or $1,000,000. You can run up to 10 paper accounts.',
    say: ['start a paper account with $10,000'],
  },
  {
    title: 'Give it a strategy',
    body: 'Trade it yourself, set an order that repeats on a schedule, or put an AI agent on it. Every trade fills at the real price, with fees and network costs taken off.',
    say: ['on paper, buy $1,000 of SOL', 'on paper, buy $100 of ETH every day', 'launch an AI agent on paper'],
  },
  {
    title: 'Make it public',
    body: 'Your strategy gets its own page and joins the paper leaderboard here, ranked by how it does against simply holding BTC. Other people can follow and copy it.',
    say: ['make my paper strategy public'],
  },
]

const FACTS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'wallet', title: 'Pretend money', body: 'Start with $1k to $1M that isn’t real. Nothing you do on paper moves real funds.' },
  { icon: 'chart', title: 'Real prices', body: 'Every buy and sell fills at the live market price, with fees and network costs taken off, like the real thing.' },
  { icon: 'star', title: 'A public scorecard', body: 'Return against holding BTC, worst drop, and weeks that made money: a track record anyone can check.' },
]

function SayChip({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 1600); return () => clearTimeout(timer) }, [copied])
  return <button type="button" className="t-paper-say" onClick={() => { navigator.clipboard.writeText(text).then(() => setCopied(true), () => undefined) }} aria-label={`Copy “${text}”`}>
    <span className="t-mono">“{text}”</span><span className="t-paper-say-copy"><Icon name={copied ? 'check' : 'copy'} size={13} />{copied ? 'Copied' : 'Copy'}</span>
  </button>
}

// Your strategy against holding BTC from the same $10,000: the picture of what the board ranks.
function ScoreChart() {
  return <figure className="t-paper-chart" aria-label="Example: a paper strategy compared with holding BTC from the same $10,000">
    <svg viewBox="0 0 320 140" role="img" aria-hidden="true">
      <line x1="16" y1="96" x2="304" y2="96" className="t-paper-chart-start" />
      <text x="16" y="110" className="t-paper-chart-label">$10,000 start</text>
      <polyline points="16,96 56,90 96,94 136,82 176,86 216,78 256,80 304,72" className="t-paper-chart-btc" />
      <polyline points="16,96 56,84 96,88 136,66 176,72 216,50 256,56 304,36" className="t-paper-chart-mine" />
      <circle cx="304" cy="36" r="4" className="t-paper-chart-dot" />
      <text x="300" y="26" textAnchor="end" className="t-paper-chart-tag t-paper-chart-tag--mine">Your strategy</text>
      <text x="300" y="66" textAnchor="end" className="t-paper-chart-tag">Holding BTC</text>
      <line x1="312" y1="36" x2="312" y2="72" className="t-paper-chart-gap" />
    </svg>
    <figcaption>The board ranks the gap: how far your strategy is ahead of, or behind, just holding BTC since it started. <span className="t-faint">Illustration, not real data.</span></figcaption>
  </figure>
}

// A sketch of the conversation in Baum, so the steps have a picture.
function ChatSketch() {
  return <div className="t-paper-chat" aria-label="What setting one up in Baum looks like">
    <div className="t-paper-chat-head"><Icon name="telegram" size={14} />Baum</div>
    <p className="t-paper-bubble t-paper-bubble--you">start a paper account with $10,000</p>
    <p className="t-paper-bubble">Paper account opened with $10,000 of pretend money.</p>
    <p className="t-paper-bubble t-paper-bubble--you">on paper, buy $1,000 of SOL</p>
    <p className="t-paper-bubble">Bought on paper at the live price, fees taken off.</p>
    <p className="t-paper-bubble t-paper-bubble--you">make my paper strategy public</p>
    <p className="t-paper-bubble">It’s public, with its own page and a spot on the board.</p>
    <p className="t-fine t-faint">A sketch: Baum’s exact replies differ.</p>
  </div>
}

export default function PaperCreate() {
  useEffect(() => { document.title = 'Launch a paper trade strategy · SLUGS' }, [])
  return <div className="t-paper-create">
    <section className="t-paper-hero">
      <div>
        <span className="t-deploy-kicker">PAPER TRADING</span>
        <h1>Launch a paper trade strategy.</h1>
        <p className="t-deploy-lede">Try a trading idea with pretend money at real prices, see how it does against simply holding BTC, and put the track record where everyone can see it. Nothing here risks real funds.</p>
        <div className="t-actions">
          <a className="t-top-button t-top-button--primary" href={baumLinks.ref()} target="_blank" rel="noreferrer"><Icon name="telegram" size={14} /><span>Open Baum to start</span></a>
          <Link className="t-top-button" to="/leaderboard?category=Paper"><Icon name="chart" size={14} /><span>See the paper leaderboard</span></Link>
        </div>
      </div>
      <ScoreChart />
    </section>

    <section aria-labelledby="paper-what">
      <h2 id="paper-what" className="t-paper-h2">What’s a paper trade strategy?</h2>
      <div className="t-paper-facts">{FACTS.map((fact) => <div className="t-paper-fact" key={fact.title}>
        <span className="t-empty-icon"><Icon name={fact.icon} size={18} /></span><h3>{fact.title}</h3><p>{fact.body}</p>
      </div>)}</div>
    </section>

    <section aria-labelledby="paper-how" className="t-paper-how">
      <div>
        <h2 id="paper-how" className="t-paper-h2">Set one up in 4 steps</h2>
        <ol className="t-paper-steps">{STEPS.map((step, index) => <li key={step.title} className="t-paper-step">
          <span className="t-paper-step-number" aria-hidden="true">{index + 1}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            {step.say && <div className="t-paper-says"><span className="t-faint">Send Baum:</span>{step.say.map((text) => <SayChip key={text} text={text} />)}</div>}
            {index === 0 && <div className="t-actions">
              <a className="t-top-button t-top-button--primary" href={baumLinks.ref()} target="_blank" rel="noreferrer"><Icon name="telegram" size={14} /><span>Open Baum</span></a>
            </div>}
            {step.note && <p className="t-fine t-faint">{step.note} Only want paper trading? <a href={`https://t.me/${BAUM.bot}?start=ref-PAPER`} target="_blank" rel="noreferrer">Start with the PAPER code</a> for paper-only access.</p>}
          </div>
        </li>)}</ol>
      </div>
      <ChatSketch />
    </section>

    <section className="t-panel t-paper-done">
      <div><h2>Then watch it climb the board.</h2><p className="t-muted">Public strategies show up on the paper leaderboard within a minute. Tap one to see its trades, its chart, and who copied it.</p></div>
      <div className="t-actions">
        <Link className="t-top-button t-top-button--primary" to="/leaderboard?category=Paper"><Icon name="chart" size={14} /><span>Paper leaderboard</span></Link>
        <Link className="t-top-button" to="/paper"><span>All paper strategies</span><Icon name="chevron" size={14} /></Link>
      </div>
    </section>
  </div>
}
