import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Callout, EmptyState, TableSkeleton } from '../components/terminal/ui'
import { count, tone } from '../lib/terminal-format'
import { inUnit, pct, unitsOf, type PaperSummary } from '../lib/paper'

// Public paper strategies on Baum, best return over holding BTC first (api/paper.js).
// "From SLUGS" keeps to strategies whose owners came through, or signed in to, SLUGS.
export default function PaperList() {
  const [params, setParams] = useSearchParams()
  const mine = params.get('from') === 'slugs'
  const [state, setState] = useState<{ mine: boolean; list: PaperSummary[] | null; error: boolean }>({ mine, list: null, error: false })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    fetch(`${import.meta.env.BASE_URL}api/paper${mine ? '?mine=1' : ''}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
      .then((body) => { if (live) setState({ mine, list: Array.isArray(body.strategies) ? body.strategies : [], error: false }) })
      .catch(() => { if (live) setState({ mine, list: null, error: true }) })
    return () => { live = false }
  }, [mine, attempt])

  const loading = state.mine !== mine || (!state.list && !state.error)
  const list = state.mine === mine ? state.list : null
  return <>
    <div className="t-page-heading"><div><h1>Paper trading</h1><p>Strategies trading pretend money at real prices on Baum. Nothing here risks real funds.</p></div>
      <div className="t-segments" role="group" aria-label="Which strategies">
        <button type="button" aria-pressed={!mine} onClick={() => setParams({}, { replace: true })}>All on Baum</button>
        <button type="button" aria-pressed={mine} onClick={() => setParams({ from: 'slugs' }, { replace: true })}>From SLUGS</button>
      </div>
    </div>
    {loading ? <TableSkeleton /> : state.error || !list ? <Callout error onRetry={() => setAttempt((n) => n + 1)}>Couldn’t load paper strategies from Baum. Try again in a moment.</Callout>
      : list.length === 0 ? <section className="t-panel"><EmptyState title={mine ? 'No paper strategies from SLUGS yet' : 'No public paper strategies yet'}>Start one on Baum: ask it to “start a paper account”, then “make my paper strategy public”.</EmptyState></section>
      : <>
        <div className="t-table-scroll" role="region" aria-label="Paper strategies" tabIndex={0}><table className="t-table"><thead><tr>
          <th scope="col">#</th><th scope="col">Strategy</th><th scope="col" className="t-number">Return vs holding BTC</th><th scope="col" className="t-number">Worst drop</th><th scope="col" className="t-number">Weeks that made money</th><th scope="col" className="t-number">Worth</th><th scope="col" className="t-number">Trades</th><th scope="col" className="t-number">Days</th><th scope="col" className="t-number">Copies</th>
        </tr></thead><tbody>
          {list.map((s, index) => {
            const unit = unitsOf(s)[0]
            return <tr key={s.id}>
              <td className={`t-rank${index < 3 ? ' t-rank--top' : ''}`}>{index + 1}</td>
              <td><Link to={`/paper/${s.id}`}><strong>{s.name}</strong></Link>{s.by && <span className="t-muted"> · {s.by}</span>} <span className="t-tag">Paper</span></td>
              <td className={`t-number t-pnl ${tone(s.scores.vsBtcPct)}`}>{pct(s.scores.vsBtcPct)}</td>
              <td className="t-number">{pct(-Math.abs(s.scores.worstDropPct))}</td>
              <td className="t-number t-muted">{s.scores.weeksPositiveShare === null ? 'under a week' : `${Math.round(s.scores.weeksPositiveShare * 100)}%`}</td>
              <td className="t-number">{inUnit(s.worth[unit], unit)}</td>
              <td className="t-number">{count(s.trades)}</td>
              <td className="t-number">{count(s.daysRunning)}</td>
              <td className="t-number">{count(s.followers)}</td>
            </tr>
          })}
        </tbody></table></div>
        <div className="t-fine">PAPER TRADE: pretend money at real prices, with fees and network costs taken off. Ranked by return over simply holding BTC since each strategy started.</div>
      </>}
  </>
}
