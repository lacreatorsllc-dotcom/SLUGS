import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PAPER_LAUNCH } from '../config'
import { baumLinks } from '../lib/baum'
import Icon, { type IconName } from '../components/terminal/Icon'

// What a paper trade strategy is, and one button that starts one in Baum: baumLinks.paperLaunch()
// opens Baum's Telegram bot with SLUGS' paper launch on it, so Baum greets them, explains the sizes
// and walks them through the setup. Newcomers are let in for paper on SLUGS' code.
//
// The facts here are Baum's (baum-monorepo lib/paper-view.ts, lib/paper-share-view.ts): a launch
// from SLUGS starts with one of PAPER_LAUNCH.sizes, fills at real prices with fees and network
// costs taken off, ranked against holding BTC. Public strategies (and a paper agent's account, once
// public) show here on the Paper tab and at /paper/<id>; paper agents aren't on the agent boards.

const money = (usd: number) => `$${usd.toLocaleString('en-US')}`
const sizesText = (() => {
  const each = PAPER_LAUNCH.sizes.map(money)
  return each.length < 2 ? each.join('') : `${each.slice(0, -1).join(', ')} or ${each[each.length - 1]}`
})()

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Tap Launch a paper strategy',
    body: 'Baum opens in Telegram, knows you came from SLUGS, and walks you through it. Your SLUGS and Baum accounts are the same account. New to Baum? The button brings SLUGS’ invite with it.',
  },
  {
    title: 'Pick a size and a kind',
    body: `Start with ${sizesText} of pretend money (${money(PAPER_LAUNCH.defaultSize)} by default). Your strategy can use all or part of it. Trade a paper account yourself, or put a paper agent on it that buys on a schedule by itself.`,
  },
  {
    title: 'Make it public',
    body: 'Your strategy gets its own page and joins the Paper leaderboard here, ranked by how it does against simply holding BTC. Other people can follow and copy it.',
  },
]

const FACTS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'wallet', title: 'Pretend money', body: `Start with ${sizesText} that isn’t real. Nothing you do on paper moves real funds.` },
  { icon: 'chart', title: 'Real prices', body: 'Every buy and sell fills at the live market price, with fees and network costs taken off, like the real thing.' },
  { icon: 'star', title: 'A public scorecard', body: 'Return against holding BTC, worst drop, and weeks that made money: a track record anyone can check.' },
]

function LaunchButton({ label = 'Launch a paper strategy' }: { label?: string }) {
  return <a className="t-top-button t-top-button--primary" href={baumLinks.paperLaunch()} target="_blank" rel="noreferrer"><Icon name="telegram" size={14} /><span>{label}</span></a>
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
    <p className="t-paper-bubble">You came over from SLUGS to launch a paper strategy. {sizesText}? It can use all or part of it.</p>
    <p className="t-paper-bubble t-paper-bubble--you">{money(PAPER_LAUNCH.defaultSize)}. Buy $100 of ETH every day</p>
    <p className="t-paper-bubble">Paper agent set up. Confirm and it runs on its own.</p>
    <p className="t-paper-bubble t-paper-bubble--you">make it public</p>
    <p className="t-paper-bubble">It’s public, with its own page and a spot on the Paper board.</p>
    <p className="t-fine t-faint">A sketch: Baum’s exact replies differ.</p>
  </div>
}

export default function PaperCreate() {
  useEffect(() => { document.title = 'Launch a paper strategy · SLUGS' }, [])
  return <div className="t-paper-create">
    <section className="t-paper-hero">
      <div>
        <span className="t-deploy-kicker">PAPER TRADING</span>
        <h1>Launch a paper strategy.</h1>
        <p className="t-deploy-lede">Try a trading idea with pretend money at real prices, see how it does against simply holding BTC, and put the track record where everyone can see it. Nothing here risks real funds.</p>
        <p className="t-muted">Starting sizes: {sizesText}, {money(PAPER_LAUNCH.defaultSize)} by default. Your strategy can use all or part of it.</p>
        <div className="t-actions">
          <LaunchButton />
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
        <h2 id="paper-how" className="t-paper-h2">How it works</h2>
        <ol className="t-paper-steps">{STEPS.map((step, index) => <li key={step.title} className="t-paper-step">
          <span className="t-paper-step-number" aria-hidden="true">{index + 1}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            {index === 0 && <div className="t-actions"><LaunchButton /></div>}
          </div>
        </li>)}</ol>
      </div>
      <ChatSketch />
    </section>

    <section className="t-panel t-paper-done">
      <div><h2>Then watch it climb the board.</h2><p className="t-muted">Public strategies show up on the Paper leaderboard within a minute. Tap one to see its trades, its chart, and who copied it. A paper agent shows here through its paper account once that’s public, not on the agent boards, which rank real wallets.</p></div>
      <div className="t-actions">
        <Link className="t-top-button t-top-button--primary" to="/leaderboard?category=Paper"><Icon name="chart" size={14} /><span>Paper leaderboard</span></Link>
        <Link className="t-top-button" to="/paper"><span>All paper strategies</span><Icon name="chevron" size={14} /></Link>
      </div>
    </section>
  </div>
}
