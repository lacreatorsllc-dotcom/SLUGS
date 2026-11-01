import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Coachmarks, { type CoachStep } from '../components/terminal/Coachmarks'
import DeployChat from '../components/terminal/DeployChat'
import Icon from '../components/terminal/Icon'
import { EmptyState, IconLink } from '../components/terminal/ui'
import { useAuthSession } from '../lib/auth-context'
import { baumLinks } from '../lib/baum'
import { MAX_NAME, NAME_IDEAS, agentSlugPart, suggestName } from '../lib/deploy'
import { markTourSeen, shouldShowTour } from '../lib/tour'

// Deploy a slug: name it, then set it up by chat right here (bottom left) or in Baum on
// Telegram. Both make the same agent on the same Baum account. First-timers get a short
// walkthrough of floating cards pointing at each part.

const TOUR: CoachStep[] = [
  { target: 'deploy-name', title: 'Name your slug', body: 'Its SLUG is your username, then what it does, like goobz/dca-bot. You can rename it later.' },
  { target: 'deploy-ideas', title: 'Stuck on a name?', body: 'Tap an idea, or Shuffle for more. Names say what the bot does: dca-bot, hodl-bot, sniper-bot.' },
  { target: 'deploy-chat-button', title: 'Set it up in chat', body: 'Your bot pops up in the corner and asks what to buy, how much and how often. About a minute.' },
  { target: 'deploy-telegram', title: 'Or use Telegram', body: 'Prefer Baum in Telegram? It opens with your bot’s name ready. Same agent either way.' },
  { target: 'deploy-account', title: 'One account', body: 'SLUGS and Baum share your agents, wallet and PnL. An agent made here shows in Telegram, and the other way round.' },
]

export default function Deploy() {
  const { user, guest } = useAuthSession()
  const [name, setName] = useState('dca-bot')
  const [chat, setChat] = useState(false)
  const [telegram, setTelegram] = useState(false)
  const [tour, setTour] = useState(false)
  useEffect(() => { document.title = 'Deploy a slug · SLUGS' }, [])
  // The walkthrough starts once the welcome tour, if it's showing, is closed.
  useEffect(() => {
    if (!user || !shouldShowTour('deploy', user)) return
    const timer = window.setInterval(() => {
      if (document.querySelector('dialog[open]')) return
      window.clearInterval(timer)
      setTour(true)
    }, 400)
    return () => window.clearInterval(timer)
  }, [user])

  if (!user) return <EmptyState title={guest ? 'Make your account to deploy' : 'Sign in to deploy'} icon="bot"
    action={guest ? <a className="t-submit" href={baumLinks.join(guest.code)} target="_blank" rel="noreferrer"><Icon name="telegram" size={14} />Create my account on Baum</a> : <IconLink icon="user" label="Sign in with Baum" to="/login" variant="outline" />}>
    Your agents live on your Baum account, so you need one before you deploy, here or in Telegram.
  </EmptyState>

  const username = user.username
  const part = agentSlugPart(name) || 'my-bot'
  async function openTelegram() {
    // Telegram can't prefill a message to Baum, so the request goes on the clipboard.
    await navigator.clipboard.writeText(`Launch an agent named ${part}`).catch(() => undefined)
    window.open(baumLinks.launch(), '_blank', 'noopener')
    setTelegram(true)
    setChat(false)
  }
  function endTour() { markTourSeen('deploy'); setTour(false) }

  return <div className="t-deploy">
    <section className="t-deploy-main">
      <span className="t-deploy-kicker">STEP 1 OF 3 · NAME IT</span>
      <h1>Deploy a slug.</h1>
      <p className="t-deploy-lede">Name your agent for what it does. Then set it up by chat right here, or in Baum on Telegram.</p>

      <label className="t-deploy-label" htmlFor="deploy-name">Its SLUG</label>
      <div className="t-deploy-slugbox" data-tour="deploy-name">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="t-deploy-face">{(username ?? 'you').slice(0, 2).toUpperCase()}</span>}
        <span className="t-mono t-deploy-owner">{username ?? 'you'}<span className="t-welcome-slug-agent">/</span></span>
        <input id="deploy-name" className="t-mono" value={name} maxLength={MAX_NAME} autoComplete="off" spellCheck={false}
          onChange={(event) => setName(event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, ''))} />
        <button type="button" className="t-chip" onClick={() => setName(suggestName(name))}><Icon name="refresh" size={12} />Shuffle</button>
      </div>
      <div className="t-deploy-ideas" data-tour="deploy-ideas">
        <span className="t-faint">Ideas</span>
        {NAME_IDEAS.map((idea) => <button type="button" key={idea} className="t-chip" aria-pressed={name === idea} onClick={() => setName(idea)}>{idea}</button>)}
      </div>
      {!username && <p className="t-fine t-negative">Pick your username first: your agents’ SLUGs start with it. <Link to="/profile?edit=username">Set my username</Link></p>}

      <div className="t-deploy-choices">
        <button type="button" className="t-submit t-deploy-choice" data-tour="deploy-chat-button" disabled={!username || !agentSlugPart(name)} onClick={() => { setChat(true); setTelegram(false) }}>
          <Icon name="message" size={16} />Set it up in chat
        </button>
        <button type="button" className="t-submit t-submit--secondary t-deploy-choice" data-tour="deploy-telegram" onClick={openTelegram}>
          <Icon name="telegram" size={16} />Set it up in Telegram
        </button>
      </div>
      {telegram && <p className="t-fine t-positive" role="status">Baum opened in Telegram, and “Launch an agent named {part}” is copied: paste it there. Your agent shows up here once you confirm.</p>}

      <p className="t-deploy-account" data-tour="deploy-account"><span aria-hidden="true"><b>S</b><b>B</b></span>SLUGS and Baum are one account: agents made here show in Telegram, and the other way round.</p>
      <button type="button" className="t-link-button t-deploy-howto" onClick={() => setTour(true)}>How this works</button>
    </section>

    {chat && username && <DeployChat key={part} username={username} name={part} picture={user.avatarUrl} onClose={() => setChat(false)} />}
    {!chat && username && agentSlugPart(name) && !telegram && <button type="button" className="t-deploy-bubble" onClick={() => setChat(true)}><Icon name="message" size={14} />Set up {username}/{part}</button>}
    {tour && <Coachmarks steps={TOUR} onDone={endTour} />}
  </div>
}
