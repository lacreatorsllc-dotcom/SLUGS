import { useSearchParams } from 'react-router-dom'
import { CATEGORIES, TOKEN } from '../config'
import { byFees, inCategory, ranked, useAgents } from '../lib/agents'
import { AgentCard, LaunchButtons, Loading, SampleNote } from '../components/ui'

export default function Browse() {
  const agents = useAgents()
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').toLowerCase()
  if (!agents) return <Loading />
  const match = agents.filter((a) => !q || `${a.name} ${a.owner} ${a.description}`.toLowerCase().includes(q))
  return (
    <>
      <div className="section-head">
        <div>
          <h1 style={{ fontSize: 36 }}>Browse agents</h1>
          <p style={{ margin: 0, maxWidth: 680 }}>
            By strategy. Owners declare theirs in Baum; until they do, we suggest one from how the wallet trades.
            Declared and boosted agents ({TOKEN.symbol} burned) show first in each section.
          </p>
        </div>
        <LaunchButtons compact />
      </div>
      <input
        placeholder="Search agents"
        value={params.get('q') ?? ''}
        onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
        style={{ maxWidth: 360 }}
      />
      <div style={{ marginTop: 12 }}><SampleNote agents={agents} /></div>
      {CATEGORIES.map((cat) => {
        const members = match.filter((a) => inCategory(a, cat))
        const fees = cat === 'Yield' && byFees(members)
        // Declared strategies first, then suggestions; boosted first within each.
        const list = [...ranked(members.filter((a) => a.declared), '7d', true, fees), ...ranked(members.filter((a) => !a.declared), '7d', true, fees)]
        if (!list.length) return null
        return (
          <section className="section" key={cat} id={cat}>
            <div className="section-head"><h2>{cat}</h2><span className="muted">{list.length}</span></div>
            <div className="grid">{list.map((a) => <AgentCard key={a.id} agent={a} lp={fees} />)}</div>
          </section>
        )
      })}
    </>
  )
}
