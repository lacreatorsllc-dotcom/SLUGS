import { useSearchParams } from 'react-router-dom'
import { BAUM } from '../config'
import { baumLinks } from '../lib/baum'
import { useAgents } from '../lib/agents'
import { signOut, useMe } from '../lib/me'
import { AgentCard, LaunchButtons, Loading } from '../components/ui'

const COPY_STATUS = { draft: 'Not confirmed yet', active: 'On', paused: 'Paused' } as const
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

// The signed-in person's account: their agents on the board, their strategy, their
// copy agent. Everything is changed in Baum; this page shows it.
export default function Profile() {
  const me = useMe()
  const agents = useAgents()
  const [params] = useSearchParams()
  const bot = `https://t.me/${BAUM.bot}`

  if (me === undefined) return <Loading />
  if (!me) {
    return (
      <section style={{ maxWidth: 640 }}>
        <h1>Your profile</h1>
        {params.get('signin') === 'failed' && (
          <p className="callout">That sign-in link didn't work. It works once, for 10 minutes. Tap Sign in again for a new one.</p>
        )}
        <p>Sign in with your Baum account. Baum opens in Telegram and sends you a button that signs you in here.</p>
        <div className="row">
          <a className="btn primary" href={baumLinks.login()} target="_blank" rel="noreferrer">Sign in with Baum</a>
        </div>
        <p className="note" style={{ marginTop: 24 }}>No Baum account yet? Deploying a slug makes one.</p>
        <LaunchButtons />
      </section>
    )
  }

  const mine = (agents ?? []).filter((a) => me.wallets.includes(a.id.toLowerCase()))
  const unranked = me.wallets.filter((w) => !mine.some((a) => a.id.toLowerCase() === w))

  return (
    <>
      <div className="section-head">
        <div>
          <h1 style={{ fontSize: 36 }}>{me.username ?? 'Your profile'}</h1>
          <p style={{ margin: 0 }}>
            {me.strategy ? <>Strategy: <strong>{me.strategy.name}</strong></> : <>No strategy declared. Tell Baum <code>/agent strategy</code> to pick one.</>}
          </p>
        </div>
        <div className="row">
          <a className="btn sm" href={bot} target="_blank" rel="noreferrer">Open Baum</a>
          <button className="btn sm" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <section className="section">
        <div className="section-head"><h2>Your agents</h2></div>
        {!agents ? <Loading /> : mine.length ? (
          <div className="grid">{mine.map((a) => <AgentCard key={a.id} agent={a} />)}</div>
        ) : (
          <p className="muted">None of your wallets are on the leaderboard yet. They show up here after their first trades.</p>
        )}
        {agents && unranked.length > 0 && (
          <p className="note">Not ranked yet: {unranked.map((w) => <code key={w} title={w} style={{ marginRight: 8 }}>{short(w)}</code>)}</p>
        )}
      </section>

      <section className="section">
        <div className="section-head"><h2>Copy agent</h2></div>
        {me.copy ? (
          <div className="card" style={{ display: 'grid', gap: 8 }}>
            <div><strong>{COPY_STATUS[me.copy.status]}</strong> <span className="muted">· at most ${me.copy.perTradeUsd} a buy, ${me.copy.dailyUsd} a day</span></div>
            {me.copy.sources.map((s) => (
              <div key={s.ref} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{s.label}</span>
                <span className="muted">{s.sizing}</span>
              </div>
            ))}
            <p className="note" style={{ margin: 0 }}>Change it in Baum: <code>/copy</code> shows it, <code>/copy pause</code> stops it.</p>
          </div>
        ) : (
          <p className="muted">You aren't copying anyone. Press Copy on any agent's page, or tell Baum <code>/copy add trader:top $10</code>.</p>
        )}
      </section>
    </>
  )
}
