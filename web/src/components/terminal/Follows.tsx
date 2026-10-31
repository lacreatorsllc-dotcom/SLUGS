import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthSession } from '../../lib/auth-context'
import { loadPeople, setFollow, useSocial, type Person } from '../../lib/social'
import { useTerminalData } from '../../lib/terminal-context'
import { count } from '../../lib/terminal-format'
import { agentPath, shortAddress, type Agent } from '../../lib/terminal-model'
import Icon from './Icon'
import { AvatarRing, Callout, CopyButton, FloatingCard } from './ui'

type List = 'followers' | 'following'

/** A person or agent's SLUG as people copy it: the username without @, else the wallet. */
const slugOf = (agent: Agent) => agent.slug ?? (agent.name.startsWith('@') ? agent.name.slice(1) : agent.id)

/** Followers and following counts that open the lists, and Follow for anyone else. */
export function SocialBar({ wallet, name }: { wallet: string; name: string }) {
  const { user } = useAuthSession()
  const social = useSocial(wallet)
  const [open, setOpen] = useState<List | null>(null)
  const { state } = social
  if (state === 'off' || state === 'error') return null
  const counts = typeof state === 'object' ? state : null
  const mine = user?.wallets.some((own) => own.toLowerCase() === wallet.toLowerCase())
  return <div className="t-social-bar">
    <button type="button" className="t-social-count" onClick={() => setOpen('followers')} disabled={!counts}><strong>{counts ? count(counts.followers) : '–'}</strong> followers</button>
    <button type="button" className="t-social-count" onClick={() => setOpen('following')} disabled={!counts}><strong>{counts ? count(counts.following) : '–'}</strong> following</button>
    {!mine && user && counts && (counts.youFollow
      ? <button type="button" className="t-follow t-follow--on" onClick={social.unfollow} aria-label={`Unfollow ${name}`}><Icon name="check" size={13} /><span>Following</span></button>
      : <button type="button" className="t-follow" onClick={social.follow}><Icon name="plus" size={13} />Follow</button>)}
    {social.error && <span className="t-fine t-negative" role="alert">{social.error}</span>}
    {open && <Follows wallet={wallet} name={name} initial={open} onClose={() => { setOpen(null); social.reload() }} />}
  </div>
}

/** The Followers / Following lists, floating over the page. */
export function Follows({ wallet, name, initial, onClose }: { wallet: string; name: string; initial: List; onClose: () => void }) {
  const { user } = useAuthSession()
  const { snapshot } = useTerminalData()
  const social = useSocial(wallet)
  const [tab, setTab] = useState<List>(initial)
  const [people, setPeople] = useState<Record<List, Person[] | null | undefined>>({ followers: undefined, following: undefined })
  const [mine, setMine] = useState<Set<string> | null>(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const me = user?.wallets[0]?.toLowerCase()

  useEffect(() => {
    if (people[tab] !== undefined) return
    loadPeople(wallet, tab).then((found) => setPeople((previous) => ({ ...previous, [tab]: found })))
  }, [wallet, tab, people])
  // Who the viewer follows, for each row's button.
  useEffect(() => {
    if (!me) return
    loadPeople(me, 'following').then((found) => setMine(new Set((found ?? []).map((person) => person.wallet))))
  }, [me])

  // Names and pictures from the boards where they're there; Baum's from the store else.
  const byWallet = useMemo(() => new Map((snapshot?.agents ?? []).map((agent) => [agent.id, agent])), [snapshot])
  const rows = (people[tab] ?? []).map((person) => {
    const agent = byWallet.get(person.wallet)
    const slug = agent ? slugOf(agent) : person.username ?? person.wallet
    return { ...person, slug, avatarUrl: agent?.avatarUrl ?? person.avatarUrl ?? undefined, path: agent ? agentPath(agent) : `/agents/${person.wallet}` }
  }).filter((row) => {
    const term = filter.trim().toLowerCase().replace(/^@/, '')
    return !term || row.slug.toLowerCase().includes(term) || (row.displayName ?? '').toLowerCase().includes(term) || row.wallet.startsWith(term)
  })

  async function toggle(other: string) {
    if (!mine) return
    const follow = !mine.has(other)
    setError('')
    setMine(new Set(follow ? [...mine, other] : [...mine].filter((item) => item !== other)))
    const problem = await setFollow(other, follow)
    if (problem) { setError(problem); setMine(mine) }
  }

  const counts = typeof social.state === 'object' ? social.state : null
  const list = people[tab]
  return <FloatingCard title={name} onClose={onClose} className="t-follows">
    <div className="t-segments" role="tablist" aria-label="Followers or following">
      {(['followers', 'following'] as List[]).map((item) => <button type="button" role="tab" key={item} aria-selected={tab === item} aria-pressed={tab === item} onClick={() => { setTab(item); setFilter('') }}>
        {item === 'followers' ? 'Followers' : 'Following'} <span className="t-faint">{counts ? count(counts[item]) : ''}</span>
      </button>)}
    </div>
    <label className="t-follows-search"><Icon name="search" size={13} /><input type="search" value={filter} placeholder="Search by SLUG or name" aria-label="Search this list" onChange={(event) => setFilter(event.target.value)} /></label>
    {error && <Callout error>{error}</Callout>}
    <div className="t-follows-list" role="tabpanel">
      {list === undefined && <p className="t-muted" role="status">Loading…</p>}
      {list === null && <Callout error onRetry={() => setPeople((previous) => ({ ...previous, [tab]: undefined }))}>Couldn’t load this list.</Callout>}
      {list && !list.length && <p className="t-muted t-follows-empty">{tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>}
      {list && list.length > 0 && !rows.length && <p className="t-muted t-follows-empty">Nobody here matches “{filter.trim()}”.</p>}
      {rows.map((row) => <div className="t-follows-row" key={row.wallet}>
        <Link to={row.path} className="t-follows-person" onClick={onClose}>
          <AvatarRing agent={{ id: row.wallet, name: row.slug, avatarUrl: row.avatarUrl }} />
          <span><strong>{row.displayName ?? row.slug}</strong><small className="t-mono">{row.slug === row.wallet ? shortAddress(row.wallet) : row.slug}</small></span>
        </Link>
        <CopyButton value={row.slug} label={`Copy ${row.slug}`} />
        {mine && row.wallet !== me && <button type="button" className={`t-follow${mine.has(row.wallet) ? ' t-follow--on' : ''}`} onClick={() => toggle(row.wallet)}
          aria-label={mine.has(row.wallet) ? `Unfollow ${row.slug}` : `Follow ${row.slug}`}>
          {mine.has(row.wallet) ? <><Icon name="check" size={13} /><span>Following</span></> : <><Icon name="plus" size={13} />Follow</>}
        </button>}
      </div>)}
    </div>
  </FloatingCard>
}
