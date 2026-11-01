import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BAUM, BRAND } from '../../config'
import { useAuthSession } from '../../lib/auth-context'
import { baumLinks } from '../../lib/baum'
import { useTerminalData } from '../../lib/terminal-context'
import { DEFAULT_PROFILES, pictureOf, savedInvitation, type InvitationProfile } from '../../lib/invitation'
import { hasSeenWelcome, markWelcomeSeen, previewsNewUserCards, welcomeKey } from '../../lib/welcome'
import Icon from './Icon'
import { CopyButton, IconButton } from './ui'

// The first-time tour: what a slug is, then the person's own slug. Shown once per
// account in each browser (lib/welcome.ts), over whichever terminal page they land on.
// Any terminal page with ?welcome opens it again.
export default function WelcomeTour({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const { user, guest } = useAuthSession()
  const replay = new URLSearchParams(useLocation().search).has('welcome')
  const key = welcomeKey(user, guest)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const next = key !== null && (replay || !hasSeenWelcome(key))
    setOpen(next)
    onOpenChange?.(next)
  }, [key, replay, onOpenChange])
  if (!open || !key) return null
  return <Tour onDone={() => { markWelcomeSeen(key); setOpen(false); onOpenChange?.(false) }} />
}

type Step = { title: ReactNode; body: ReactNode; art: ReactNode }

// The example profile on the second card: Goobz (username goobz), with their Baum picture from the board
// when it has loaded.
const EXAMPLE = { name: 'Goobz', username: 'goobz', agent: 'dca-bot', strategy: 'Spot traders', wallet: '0xf6414c58f65b106232871c0d566c417054ef6b92' }

// A Baum profile picture: the one Baum shares at sign-in, else the one on the board, else
// Baum's avatar for the wallet, else initials.
function Picture({ wallet, url, initials }: { wallet?: string; url?: string | null; initials: string }) {
  const { snapshot } = useTerminalData()
  const fromBoard = wallet ? snapshot?.agents.find((agent) => agent.id.toLowerCase() === wallet.toLowerCase())?.avatarUrl : undefined
  const src = url || fromBoard || (wallet ? `https://baumai.xyz/api/avatar/${wallet.toLowerCase()}` : null)
  const [broken, setBroken] = useState<string | null>(null)
  return src && broken !== src
    ? <img className="t-welcome-avatar t-welcome-picture" src={src} alt="" onError={() => setBroken(src)} />
    : <span className="t-welcome-avatar">{initials}</span>
}

/** A SLUG as the tour shows it: the username bright, then /agent in gray. */
function SlugText({ username, agent }: { username: string; agent?: string | null }) {
  return <span>{username}{agent && <span className="t-welcome-slug-agent">/{agent}</span>}</span>
}

/** The part of the person's first agent's SLUG after their username: sniper-bot of goobz-sniper-bot. */
function firstAgentPart(username: string, agents: { name: string; slug: string | null }[] | undefined) {
  const agent = agents?.[0]
  if (!agent) return null
  if (agent.slug?.startsWith(`${username}-`)) return agent.slug.slice(username.length + 1)
  return agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null
}

// Bots people can create, named for what they do: the ones the owner suggested in a
// personal invitation first (lib/invitation.ts), then the usual examples.
const BOT_EXAMPLES = ['sniper-bot', 'dca-bot', 'scalper-bot', 'momentum-bot', 'grid-bot', 'copy-trader', 'spot-trader']

/** One example bot after another (held still for reduced motion). */
function ExampleSlug() {
  const [bots] = useState(() => { const suggested = savedInvitation()?.bots ?? []; return [...suggested, ...BOT_EXAMPLES.filter((bot) => !suggested.includes(bot))] })
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % bots.length), 1600)
    return () => window.clearInterval(timer)
  }, [bots])
  return <SlugText username="your-name" agent={bots[index]} />
}

// The first card's examples: SLUGS people and the bots they run, or the ones chosen for
// this person in their invitation. The first shows alone, then it opens into a 2x2 grid
// where the first stays put and the other three slots take turns with everyone else.
const INTRO_MS = 1800
const SWAP_MS = 3000

function ExampleChip({ example, className = '', delay }: { example: InvitationProfile; className?: string; delay?: number }) {
  return <span className={`t-welcome-slug t-welcome-slug--small ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
    <Picture url={pictureOf(example)} initials={example.u.slice(0, 2).toUpperCase()} />
    <SlugText username={example.u} agent={example.a} />
  </span>
}

/** The first profile alone, then four at a time with three slots rotating (still for reduced motion). */
function ExampleBots() {
  const [[first, ...others]] = useState(() => { const chosen = savedInvitation()?.profiles; return chosen?.length ? chosen : DEFAULT_PROFILES })
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const shown = Math.min(3, others.length)
  const rotates = others.length > shown
  const [grid, setGrid] = useState(still || !others.length)
  const [paused, setPaused] = useState(false)
  // The rotating slots, and the next example to bring in. A sliding window of three
  // never shows anyone twice.
  const [rotation, setRotation] = useState({ slots: Array.from({ length: shown }, (_, i) => i), next: shown, turn: 0 })
  useEffect(() => {
    if (still || !others.length) return
    const timer = window.setTimeout(() => setGrid(true), INTRO_MS)
    return () => window.clearTimeout(timer)
  }, [still, others.length])
  useEffect(() => {
    if (still || !grid || paused || !rotates) return
    const timer = window.setInterval(() => setRotation(({ slots, next, turn }) => {
      const updated = [...slots]
      updated[turn % shown] = next % others.length
      return { slots: updated, next: next + 1, turn: turn + 1 }
    }), SWAP_MS)
    return () => window.clearInterval(timer)
  }, [still, grid, paused, rotates, shown, others.length])
  if (!grid) return <span className="t-welcome-slugs t-welcome-slugs--one"><ExampleChip example={first} className="t-welcome-slug--lead" /></span>
  return <span className="t-welcome-slugs t-welcome-slugs--grid" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <ExampleChip example={first} className="t-welcome-swap" />
    {rotation.slots.map((index, slot) => <ExampleChip key={`${slot}-${others[index].u}`} example={others[index]} className="t-welcome-swap" delay={rotation.turn ? undefined : 150 * (slot + 1)} />)}
  </span>
}

const ExamplePicture = () => <Picture wallet={EXAMPLE.wallet} initials="GO" />

// The signed-in person's own picture.
function OwnPicture({ initials }: { initials: string }) {
  const { user } = useAuthSession()
  return <Picture url={user?.avatarUrl} wallet={user?.wallets[0]} initials={initials} />
}

function Tour({ onDone }: { onDone: () => void }) {
  const { user, guest } = useAuthSession()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [step, setStep] = useState(0)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow }
  }, [])

  // A preview account sees the tour as a new user would: the last card asks them to claim a slug.
  const username = user?.username && !previewsNewUserCards(user) ? user.username : null
  const ownAgent = username ? firstAgentPart(username, user?.agents) : null
  const slug = username ? (ownAgent ? `${username}/${ownAgent}` : username) : null
  const steps: Step[] = [
    {
      title: <>Every agent<br />has a slug.</>,
      body: 'A slug is an identifier for an AI agent, like a handle, but for bots. It’s how agents are found, followed and tracked across the network.',
      art: <div className="t-welcome-art t-welcome-art--center t-welcome-art--examples">
        <ExampleBots />
        <span className="t-welcome-tags"><span><Icon name="search" size={12} />Found</span><span><Icon name="user" size={12} />Followed</span><span><Icon name="chart" size={12} />Tracked</span></span>
      </div>,
    },
    {
      title: <>Follow agents.<br />Watch everything.</>,
      body: 'Follow any agent’s feed. See what it’s trading and how it’s performing, in real time.',
      art: <div className="t-welcome-art">
        <span className="t-welcome-agent"><ExamplePicture /><span><strong><SlugText username={EXAMPLE.username} agent={EXAMPLE.agent} /></strong><small>{EXAMPLE.strategy} · by {EXAMPLE.name}</small></span><span className="t-welcome-following"><Icon name="check" size={12} />Following</span></span>
        <span className="t-welcome-feed"><span>2s</span><span><b className="t-positive">BUY</b> SLUGS</span><span>1m</span><span><b className="t-negative">SELL</b> ETH</span><span>4m</span><span><b className="t-positive">BUY</b> BAUM</span></span>
        <small className="t-welcome-caption"><span className="t-dot t-dot--online" />Example feed</small>
      </div>,
    },
    {
      title: <>PnL. Logs.<br />Live status.</>,
      body: 'Track performance across every agent you follow. Activity logs, trade history and live status, all in one terminal.',
      art: <div className="t-welcome-art t-welcome-art--split">
        <span className="t-welcome-tile"><small>PNL · 7D</small><svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 50 L20 46 L40 48 L60 38 L80 40 L100 30 L120 33 L140 22 L160 24 L180 14 L200 10" /></svg></span>
        <span className="t-welcome-log"><span className="t-welcome-status">Status<b><span className="t-dot t-dot--online" />Live</b></span><span><small>LOG</small>Entry · buy<br />Exit · take profit<br />Entry · buy</span></span>
      </div>,
    },
    {
      title: <>Share your<br />PnL.</>,
      body: 'Turn any agent’s PnL into a card with its profile picture. Pick Classic, Spotlight or Hero, then post it on X or download it. Tap the chart icon on your profile or on any agent’s page.',
      art: <div className="t-welcome-art t-welcome-art--center t-welcome-pnl">
        <span className="t-welcome-pnl-cards">
          <img className="t-welcome-pnl-spotlight" src={`${import.meta.env.BASE_URL}welcome/pnl-spotlight.jpg`} alt="" width="400" height="400" />
        </span>
        <small className="t-welcome-caption"><Icon name="x" size={11} />Post on X · Download PNG · Example card</small>
      </div>,
    },
    {
      title: <>Your agent.<br />Your strategy.</>,
      body: 'SLUGS plugs your agent into live markets, on-chain trading and advanced analytics. It trades on its own, buys the tokens you pick on a schedule and copy trades other agents. Deploy it here or in Baum on Telegram: it’s one account, so your agents, wallet and PnL show up in both. What you do with it is up to you. Every strategy is different, and that’s what makes it fun. Good luck.',
      art: <div className="t-welcome-art t-welcome-art--center">
        <span className="t-welcome-tags t-welcome-powers"><span><Icon name="chart" size={12} />Live markets</span><span><Icon name="trade" size={12} />Trades on chain</span><span><Icon name="refresh" size={12} />Buys on a schedule</span><span><Icon name="user" size={12} />Copy trades agents</span><span><Icon name="compare" size={12} />Advanced analytics</span></span>
        <small className="t-welcome-caption">SLUGS + Baum · one account, everything synced</small>
      </div>,
    },
    username && slug
      ? {
          title: <>This is<br />your slug.</>,
          body: 'Your slug is your identity in the agent network. People find you, follow you and track your agents by it. Change it anytime on your profile here, or in Telegram with Baum.',
          art: <div className="t-welcome-art t-welcome-art--center">
            <span className="t-welcome-slug t-welcome-slug--own"><OwnPicture initials={username.slice(0, 2).toUpperCase()} /><SlugText username={username} agent={ownAgent} /><CopyButton value={slug} label={`Copy ${slug}`} /></span>
            <span className="t-welcome-tips"><span><Icon name="search" size={13} />Anyone can find you with ⌘K</span><span><Icon name="copy" size={13} />Anyone can copy your SLUG in one click</span></span>
          </div>,
        }
      : {
          title: <>Claim<br />your slug.</>,
          body: guest
            ? 'Your slug is your agent’s identifier: your username, then what the agent does. Make your Baum account in Telegram before your invite runs out to claim yours.'
            : 'Your slug is your agent’s identifier: your username, then what the agent does. Most are named for their job: sniper-bot, dca-bot, scalper-bot, momentum-bot, grid-bot, copy-trader or spot-trader. Pick your username right here on SLUGS, or tell Baum in Telegram.',
          art: <div className="t-welcome-art t-welcome-art--center">
            <span className="t-welcome-slug t-welcome-slug--empty" aria-label="Example bots: sniper-bot, dca-bot, scalper-bot, momentum-bot, grid-bot, copy-trader, spot-trader"><ExampleSlug /></span>
            {guest
              ? <a className="t-submit t-submit--secondary t-welcome-baum" href={baumLinks.join(guest.code)} target="_blank" rel="noreferrer"><Icon name="telegram" size={14} />Create my account on Baum</a>
              : <span className="t-welcome-claim">
                <Link className="t-submit t-welcome-baum" to="/profile?edit=username" onClick={onDone}><Icon name="user" size={14} />Set my username here</Link>
                <a className="t-welcome-or" href={`https://t.me/${BAUM.bot}`} target="_blank" rel="noreferrer"><Icon name="telegram" size={13} />or set it in Telegram</a>
              </span>}
          </div>,
        },
  ]
  const last = step === steps.length - 1
  const current = steps[step]

  return <dialog ref={ref} className="t-dialog t-welcome" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onDone() }}>
    <div className="t-floating-inner t-welcome-card" key={step}>
      <div className="t-dialog-heading">
        <span className="t-welcome-count">{String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span>
        <IconButton icon="close" label="Skip the tour" onClick={onDone} />
      </div>
      <div aria-hidden={last ? undefined : true}>{current.art}</div>
      <div className="t-welcome-text">
        <h2 id={titleId}>{current.title}</h2>
        <p>{current.body}</p>
        {last && <p className="t-welcome-community"><Icon name="telegram" size={13} />Come say hi in the <a href={BRAND.telegram} target="_blank" rel="noreferrer">SLUGS Telegram</a>.</p>}
      </div>
      <div className="t-welcome-footer">
        <span className="t-welcome-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((_, index) => <span key={index} className={index === step ? 'on' : index < step ? 'done' : ''} />)}</span>
        <span className="t-actions">
          <IconButton icon="back" label="Back" variant="outline" disabled={step === 0} onClick={() => setStep((value) => value - 1)} />
          {last
            ? <button type="button" className="t-submit t-welcome-start" onClick={onDone}>Start<Icon name="chevron" size={15} /></button>
            : <IconButton icon="chevron" label="Next" variant="primary" onClick={() => setStep((value) => value + 1)} />}
        </span>
      </div>
    </div>
  </dialog>
}
