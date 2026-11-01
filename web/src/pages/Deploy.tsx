import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { TOKEN } from '../config'
import Icon from '../components/terminal/Icon'
import { AvatarRing, Callout, EmptyState, IconLink } from '../components/terminal/ui'
import { call, reasonText } from '../lib/account'
import { useAuthSession } from '../lib/auth-context'
import { baumLinks } from '../lib/baum'
import { MAX_NAME, MAX_TOKENS, MIN_BUY_USD, SUGGESTED_AGENTS, agentSlugPart, perMonthUsd, setupMessage, setupProblem, type Every, type Setup, type TokenPick } from '../lib/deploy'
import { money } from '../lib/terminal-format'
import { shortAddress } from '../lib/terminal-model'

// Deploy a slug here or in Baum on Telegram. Both make the same agent on the same Baum
// account, so it shows up in both places with the same wallet, username and PnL.

const SUGGESTED: TokenPick[] = [{ address: TOKEN.address, symbol: TOKEN.symbol }, { address: 'ETH', symbol: 'ETH' }]
const CONTRACT = /^0x[0-9a-fA-F]{40}$/

type Result = { kind: 'done'; path: string } | { kind: 'handoff'; copied: boolean } | null

export function ConnectedNote() {
  return <section className="t-connected" aria-label="SLUGS and Baum are connected">
    <div className="t-connected-head"><span className="t-connected-marks" aria-hidden="true"><b>S</b><Icon name="refresh" size={13} /><b>B</b></span><strong>SLUGS and Baum are one account</strong></div>
    <ul>
      <li><Icon name="user" size={13} />Same sign-in, username and picture</li>
      <li><Icon name="bot" size={13} />Agents made here show in Telegram, and the other way round</li>
      <li><Icon name="wallet" size={13} />Same wallets and funds</li>
      <li><Icon name="chart" size={13} />Same trades and PnL, live in both</li>
    </ul>
  </section>
}

export default function Deploy() {
  const { user, guest } = useAuthSession()
  const [name, setName] = useState('')
  const [tokens, setTokens] = useState<TokenPick[]>([SUGGESTED[0]])
  const [contract, setContract] = useState('')
  const [amount, setAmount] = useState('25')
  const [every, setEvery] = useState<Every>('day')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result>(null)
  useEffect(() => { document.title = 'Deploy a slug · SLUGS' }, [])

  if (!user) return <EmptyState title={guest ? 'Make your account to deploy' : 'Sign in to deploy'} icon="bot"
    action={guest ? <a className="t-submit" href={baumLinks.join(guest.code)} target="_blank" rel="noreferrer"><Icon name="telegram" size={14} />Create my account on Baum</a> : <IconLink icon="user" label="Sign in with Baum" to="/login" variant="outline" />}>
    Your agents live on your Baum account, so you need one before you deploy, here or in Telegram.
  </EmptyState>

  const setup: Setup = { name, tokens, amountUsd: Number(amount), every }
  const problem = setupProblem(setup)
  const slug = `${user.username ?? 'you'}/${agentSlugPart(name) || 'your-agent'}`
  const has = (address: string) => tokens.some((token) => token.address.toLowerCase() === address.toLowerCase())
  const toggle = (pick: TokenPick) => setTokens((list) => (list.some((token) => token.address === pick.address) ? list.filter((token) => token.address !== pick.address) : [...list, pick]))
  function addContract() {
    const address = contract.trim()
    if (!CONTRACT.test(address)) return setError('Paste a full contract address: 0x and 40 characters.')
    if (has(address)) return setContract('')
    setTokens((list) => [...list, { address, symbol: shortAddress(address) }])
    setContract(''); setError('')
  }

  async function deploy(event: FormEvent) {
    event.preventDefault()
    if (problem || !user?.username) return
    setBusy(true); setError('')
    const r = await call({ action: 'launch-agent', name: name.trim(), tokens: tokens.map((token) => token.address), amountUsd: setup.amountUsd, every })
    setBusy(false)
    const json = r.json as { reason?: string; slug?: string; wallet?: string }
    if (r.ok) return setResult({ kind: 'done', path: `/agents/${json.slug ?? json.wallet ?? ''}` })
    // Baum hasn't opened deploying to partners yet: finish the same setup in Telegram.
    if (json.reason === 'pending') {
      const copied = await navigator.clipboard.writeText(setupMessage(setup)).then(() => true, () => false)
      setResult({ kind: 'handoff', copied })
      window.open(baumLinks.launch(), '_blank', 'noopener')
      return
    }
    setError(reasonText(json))
  }

  return <>
    <div className="t-page-heading"><div><h1>Deploy a slug</h1><p>Set up an AI trading agent right here, or in Baum on Telegram. It’s the same agent either way.</p></div></div>
    <ConnectedNote />

    <div className="t-deploy-ways">
      <section className="t-feature-card t-deploy-way t-deploy-way--on" aria-label="Set it up here">
        <div className="t-section-title"><span className="t-section-icon"><Icon name="plus" /></span><h2>Set it up here</h2><span className="t-tag">ON SLUGS</span></div>
        <p>Pick a name, the tokens and how much to buy. We send it to Baum and it shows up in Telegram too.</p>
      </section>
      <section className="t-feature-card t-deploy-way" aria-label="Set it up in Telegram">
        <div className="t-section-title"><span className="t-section-icon"><Icon name="telegram" /></span><h2>Set it up in Telegram</h2></div>
        <p>Chat with Baum and say “launch an agent”. It shows up here as soon as it’s made.</p>
        <a className="t-submit t-submit--secondary" href={baumLinks.launch()} target="_blank" rel="noreferrer"><Icon name="telegram" size={14} />Open Baum in Telegram</a>
      </section>
    </div>

    {result?.kind === 'done' && <Callout>Your agent is on its way. Baum is setting up <strong>{slug}</strong> with its own wallet: fund it to start trading. <Link to={result.path}>Open its page</Link>.</Callout>}
    {result?.kind === 'handoff' && <Callout>Almost there. Deploying straight from SLUGS turns on once Baum opens it to us, so Baum just opened in Telegram{result.copied ? ' and your setup is copied: paste it there and confirm' : ': tell it your setup and confirm'}. Your agent shows up here as soon as it’s made.</Callout>}

    <form className="t-feature-card t-deploy-form" onSubmit={deploy}>
      <div className="t-deploy-field">
        <label htmlFor="deploy-name">Name</label>
        <input id="deploy-name" value={name} placeholder="Name your agent or choose a suggestion" maxLength={MAX_NAME} autoComplete="off" spellCheck={false} onChange={(event) => setName(event.target.value)} />
        <span className="t-deploy-label">Suggested trading agents</span>
        <div className="t-deploy-tokens" role="group" aria-label="Suggested trading agents">
          {SUGGESTED_AGENTS.map((agent) => <button type="button" key={agent.name} className="t-chip" title={agent.about} aria-pressed={agentSlugPart(name) === agent.name} onClick={() => setName(agent.name)}>{agentSlugPart(name) === agent.name && <Icon name="check" size={12} />}{agent.name}</button>)}
        </div>
        <p className="t-fine">{SUGGESTED_AGENTS.find((agent) => agent.name === agentSlugPart(name))?.about ?? 'Choose a suggestion or name your own.'} All start with scheduled buys; customize the tokens and frequency below.</p>
        <div className="t-deploy-slug"><AvatarRing agent={{ id: user.wallets[0] ?? slug, name: user.username ?? 'you', avatarUrl: user.avatarUrl ?? undefined }} /><span className="t-mono">{user.username ?? 'you'}<span className="t-welcome-slug-agent">/{agentSlugPart(name) || 'your-agent'}</span></span><small>Its SLUG. You can rename it later.</small></div>
        {!user.username && <p className="t-fine t-negative">Pick your username first: your agents’ SLUGs start with it. <Link to="/profile?edit=username">Set my username</Link></p>}
      </div>

      <div className="t-deploy-field">
        <span className="t-deploy-label">Strategy</span>
        <div className="t-deploy-strategy"><strong>Buy on a schedule (DCA)</strong><span>Buys the tokens you pick, the amount you set, every day or week. It’s what Baum agents run today.</span></div>
      </div>

      <div className="t-deploy-field">
        <span className="t-deploy-label">Tokens to buy <span className="t-faint">· up to {MAX_TOKENS}</span></span>
        <div className="t-deploy-tokens">
          {[...SUGGESTED, ...tokens.filter((token) => !SUGGESTED.some((item) => item.address === token.address))].map((token) =>
            <button type="button" key={token.address} className="t-chip" aria-pressed={has(token.address)} onClick={() => toggle(token)}>{has(token.address) && <Icon name="check" size={12} />}{token.address === 'ETH' || token.symbol.startsWith('0x') ? token.symbol : `$${token.symbol}`}</button>)}
        </div>
        <div className="t-actions"><input value={contract} placeholder="Or paste a token’s contract address (0x…)" aria-label="Token contract address" autoComplete="off" spellCheck={false} onChange={(event) => { setContract(event.target.value); setError('') }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addContract() } }} />
          <button type="button" className="t-submit t-submit--secondary t-deploy-shuffle" onClick={addContract} disabled={!contract.trim() || tokens.length >= MAX_TOKENS}><Icon name="plus" size={14} />Add</button></div>
      </div>

      <div className="t-deploy-field t-deploy-amount">
        <div><label htmlFor="deploy-amount">Each buy</label><div className="t-deploy-money"><span>$</span><input id="deploy-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ''))} /></div></div>
        <div><span className="t-deploy-label">Every</span><div className="t-segments" role="group" aria-label="How often">{(['day', 'week'] as Every[]).map((value) => <button type="button" key={value} aria-pressed={every === value} onClick={() => setEvery(value)}>{value === 'day' ? 'Day' : 'Week'}</button>)}</div></div>
        <p className="t-fine">{problem ? '' : `About ${money(perMonthUsd(setup))} a month across ${tokens.length} ${tokens.length === 1 ? 'token' : 'tokens'}. Minimum $${MIN_BUY_USD} a buy.`}</p>
      </div>

      {(error || problem) && <p className={`t-fine${error ? ' t-negative' : ''}`} role={error ? 'alert' : undefined}>{error || problem}</p>}
      <button type="submit" className="t-submit" disabled={busy || Boolean(problem) || !user.username}><Icon name="rocket" size={15} />{busy ? 'Deploying…' : `Deploy ${slug}`}</button>
      <p className="t-fine">Baum gives your agent its own wallet. It trades only after you fund it, within the rules above, and messages you each time it trades. Agents trade real funds and can lose them.</p>
    </form>
  </>
}
