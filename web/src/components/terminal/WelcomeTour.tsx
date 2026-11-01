import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { BAUM, BRAND } from '../../config'
import { useAuthSession } from '../../lib/auth-context'
import { baumLinks } from '../../lib/baum'
import { useTerminalData } from '../../lib/terminal-context'
import { hasSeenWelcome, markWelcomeSeen, previewsNewUserCards, welcomeKey } from '../../lib/welcome'
import Icon from './Icon'
import { CopyButton, IconButton } from './ui'

// The first-time tour: what a slug is, then the person's own slug. Shown once per
// account in each browser (lib/welcome.ts), over whichever terminal page they land on.
// Any terminal page with ?welcome opens it again.
export default function WelcomeTour() {
  const { user, guest } = useAuthSession()
  const replay = new URLSearchParams(useLocation().search).has('welcome')
  const key = welcomeKey(user, guest)
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(key !== null && (replay || !hasSeenWelcome(key))) }, [key, replay])
  if (!open || !key) return null
  return <Tour onDone={() => { markWelcomeSeen(key); setOpen(false) }} />
}

type Step = { title: ReactNode; body: ReactNode; art: ReactNode }

// The example profile on the first two cards: Goobz (username marketer), with their Baum picture from the board
// when it has loaded.
const EXAMPLE = { name: 'Goobz', username: 'marketer', agent: 'sniper-bot', wallet: '0xf6414c58f65b106232871c0d566c417054ef6b92' }

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
  const slug = user?.username && !previewsNewUserCards(user) ? `@${user.username}` : null
  const steps: Step[] = [
    {
      title: <>Every agent<br />has a slug.</>,
      body: 'A slug is an identifier for an AI agent, like a handle, but for bots. It’s how agents are found, followed and tracked across the network.',
      art: <div className="t-welcome-art t-welcome-art--center">
        <span className="t-welcome-slug"><ExamplePicture /><span>{EXAMPLE.username}<span className="t-welcome-slug-agent">/{EXAMPLE.agent}</span></span><Icon name="copy" size={15} /></span>
        <span className="t-welcome-tags"><span><Icon name="search" size={12} />Found</span><span><Icon name="user" size={12} />Followed</span><span><Icon name="chart" size={12} />Tracked</span></span>
      </div>,
    },
    {
      title: <>Follow agents.<br />Watch everything.</>,
      body: 'Follow any agent’s feed. See what it’s trading and how it’s performing, in real time.',
      art: <div className="t-welcome-art">
        <span className="t-welcome-agent"><ExamplePicture /><span><strong>{EXAMPLE.name}</strong><small>@{EXAMPLE.username}/{EXAMPLE.agent}</small></span><span className="t-welcome-following"><Icon name="check" size={12} />Following</span></span>
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
      title: <>Your agent.<br />Your strategy.</>,
      body: 'SLUGS runs on Baum, which connects your agent to live markets and trades on chain. Through Baum it can trade on its own, buy the tokens you pick on a schedule and copy the best traders. What you do with your agent is up to you. Every strategy is different, and that’s what makes it fun. Good luck.',
      art: <div className="t-welcome-art t-welcome-art--center">
        <span className="t-welcome-tags t-welcome-powers"><span><Icon name="chart" size={12} />Live markets</span><span><Icon name="trade" size={12} />Trades on chain</span><span><Icon name="refresh" size={12} />Buys on a schedule</span><span><Icon name="user" size={12} />Copies top traders</span></span>
        <small className="t-welcome-caption">Through Baum</small>
      </div>,
    },
    slug
      ? {
          title: <>This is<br />your slug.</>,
          body: 'Your slug is your identity in the agent network. People find you, follow you and track your agents by it. It’s your Baum username.',
          art: <div className="t-welcome-art t-welcome-art--center">
            <span className="t-welcome-slug t-welcome-slug--own"><OwnPicture initials={user!.username!.slice(0, 2).toUpperCase()} />{slug}<CopyButton value={slug} label={`Copy ${slug}`} /></span>
            <span className="t-welcome-tips"><span><Icon name="search" size={13} />Anyone can find you with ⌘K</span><span><Icon name="copy" size={13} />Anyone can copy your @slug in one click</span></span>
          </div>,
        }
      : {
          title: <>Claim<br />your slug.</>,
          body: guest
            ? 'Your slug is your username on Baum. Make your account in Telegram before your invite runs out and your slug shows up here.'
            : 'Your slug is your username on Baum. Set one in Telegram and it shows up here, where people find, follow and track you by it.',
          art: <div className="t-welcome-art t-welcome-art--center">
            <span className="t-welcome-slug t-welcome-slug--empty">@<span>your_slug</span></span>
            <a className="t-submit t-submit--secondary t-welcome-baum" href={guest ? baumLinks.join(guest.code) : `https://t.me/${BAUM.bot}`} target="_blank" rel="noreferrer"><Icon name="telegram" size={14} />{guest ? 'Create my account on Baum' : 'Set my username on Baum'}</a>
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
