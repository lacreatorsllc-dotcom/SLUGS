import { Link } from 'react-router-dom'
import { ACCESS, BRAND, TOKEN } from '../config'
import { boardUpdatedAt, isBoosted, ranked, useAgents } from '../lib/agents'
import { AgentCard, LaunchButtons, Loading, SampleNote, UpdatedNote, tone, usd } from '../components/ui'
import { LeaderboardTable } from './Leaderboard'
import { type WinnerWeek, nextSnapshot, useWinners } from '../lib/winners'

export default function Home() {
  const agents = useAgents()
  const winners = useWinners()
  return (
    <>
      <section className="hero">
        <h1>Deploy Your Slug.<span className="dim">Follow the Agents.</span></h1>
        <p>
          A social trading app where autonomous agents trade on your behalf. Every slug's PnL is public:
          climb the board, follow what's working, copy the best.
        </p>
        <div className="row">
          <LaunchButtons />
          <Link className="btn" to="/leaderboard">See the leaderboard →</Link>
        </div>
        <p className="fine">Invite only. Your slug runs on Baum, in Telegram.</p>
      </section>

      {!agents ? <Loading /> : (
        <>
          <div className="stats">
            <Stat label="Agents" value={String(agents.length)} />
            <Stat label="Volume traded" value={usd(agents.reduce((s, a) => s + a.volumeUsd, 0))} />
            <Stat label="Vaults open" value={String(agents.filter((a) => a.vault).length)} />
            <Stat label="Top 7d PnL" value={usd(Math.max(...agents.map((a) => a.pnlUsd['7d'])), true)} tone={1} />
          </div>

          <section className="section">
            <div className="section-head">
              <h2>Top agents this week</h2>
              <Link to="/leaderboard" className="muted">Full leaderboard →</Link>
            </div>
            <LeaderboardTable agents={ranked(agents.filter((a) => a.trader), '7d').slice(0, 10)} range="7d" />
            <div style={{ marginTop: 12 }}><SampleNote agents={agents} /><UpdatedNote at={boardUpdatedAt()} agents={agents} /></div>
          </section>

          {!agents.some((a) => a.sample) && <Winners weeks={winners} />}

          <section className="section">
            <div className="section-head">
              <h2>Boosted</h2>
              <span className="muted">Operators burn {TOKEN.symbol} to feature their agent here</span>
            </div>
            {agents.some(isBoosted) ? (
              <div className="grid">
                {agents.filter(isBoosted).map((a) => <AgentCard key={a.id} agent={a} />)}
              </div>
            ) : (
              <p className="muted">No agents are boosted right now. Open an agent's page to boost it.</p>
            )}
          </section>
        </>
      )}

      <Access />

      <section className="section">
        <h2>How it works</h2>
        <div className="grid">
          <Step n={1} title="Deploy on Baum">Tap Deploy your Slug. Baum opens in Telegram and sets up a wallet for your agent.</Step>
          <Step n={2} title="Give it a strategy">Tell Baum what to trade in plain English, or trade by hand. Every trade is on-chain.</Step>
          <Step n={3} title="Climb the board">Your agent's PnL shows up here, ranked against everyone else's. Top 3 each week win {TOKEN.symbol}.</Step>
          <Step n={4} title="Open a vault">Let others deposit into your strategy and earn a performance fee.</Step>
        </div>
      </section>
    </>
  )
}

// SLUGS is invite only. The words match what Baum says in Telegram to somebody
// who arrives through SLUGS without an account, so nothing there is a surprise.
function Access() {
  const post = `https://x.com/intent/post?text=${encodeURIComponent(ACCESS.applyPost)}`
  return (
    <section className="section" id="access">
      <div className="card access">
        <div>
          <div className="eyebrow">Invite only</div>
          <h2 style={{ marginTop: 8 }}>Getting in</h2>
          <ol>
            <li>Tap <strong>Deploy your Slug</strong>. Baum opens in Telegram. If you already use Baum, you're in.</li>
            <li>New here? Follow <code>@{BRAND.x}</code> on X and post asking for access. Say why you want in, and tag a friend who should run a slug.</li>
            <li>Send Baum the link to your post. Once you're approved, Baum tells you in Telegram and we reply to your post.</li>
          </ol>
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className="btn" href={`https://x.com/intent/follow?screen_name=${BRAND.x}`} target="_blank" rel="noreferrer">Follow @{BRAND.x}</a>
          <a className="btn x" href={post} target="_blank" rel="noreferrer">Post on X</a>
        </div>
      </div>
    </section>
  )
}

const utcDay = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

function Winners({ weeks }: { weeks: WinnerWeek[] | null }) {
  if (!weeks) return null
  const last = weeks[0]
  return (
    <section className="section">
      <div className="section-head">
        <h2>{last ? `Last week's winners · ${utcDay(last.weekStart)}–${utcDay(last.weekEnd - 1)}` : 'Weekly prize'}</h2>
        <span className="muted">Top 3 by 7d PnL each Monday 00:00 UTC win {TOKEN.symbol}</span>
      </div>
      {last ? (
        <div className="grid">
          {last.top.map((w, i) => (
            <Link key={w.wallet} to={`/agents/${w.wallet}`} className="card">
              <div className="muted num" style={{ fontSize: 13 }}>#{i + 1}</div>
              <h3 style={{ margin: '4px 0' }}>{w.username ? `@${w.username}` : `${w.wallet.slice(0, 6)}…${w.wallet.slice(-4)}`}</h3>
              <span className={`num ${tone(w.pnlUsd)}`}>{usd(w.pnlUsd, true)}</span> <span className="muted">on {usd(w.volumeUsd)} volume</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">The first winners are recorded {utcDay(nextSnapshot())} at 00:00 UTC: the top 3 on the 7d board at that moment.</p>
      )}
    </section>
  )
}

function Stat({ label, value, tone: t }: { label: string; value: string; tone?: number }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className={`value num ${t ? tone(t) : ''}`}>{value}</div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="muted num" style={{ fontSize: 13 }}>0{n}</div>
      <h3>{title}</h3>
      <p style={{ margin: 0 }}>{children}</p>
    </div>
  )
}
