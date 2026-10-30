import { useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CATEGORIES, TOKEN } from '../config'
import { type Agent, byFees, inCategory, ranked, useAgents } from '../lib/agents'
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
            <CategoryGrid list={list} lp={fees} />
          </section>
        )
      })}
    </>
  )
}

const ROWS = 3

// The first three rows of a section, and a button for the rest. The grid fills
// as many columns as fit, so three rows is read from the columns it laid out.
function CategoryGrid({ list, lp }: { list: Agent[]; lp: boolean }) {
  const grid = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(1)
  const [open, setOpen] = useState(false)
  useLayoutEffect(() => {
    const el = grid.current
    if (!el) return
    const measure = () => setCols(Math.max(1, getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length))
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  const shown = open ? list : list.slice(0, cols * ROWS)
  return (
    <>
      <div className="grid" ref={grid}>{shown.map((a) => <AgentCard key={a.id} agent={a} lp={lp} />)}</div>
      {list.length > cols * ROWS && (
        <button className="btn sm" style={{ marginTop: 12 }} onClick={() => setOpen(!open)}>
          {open ? 'Show less' : `View all ${list.length}`}
        </button>
      )}
    </>
  )
}
