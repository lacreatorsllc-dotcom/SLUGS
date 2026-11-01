import { useEffect, useState } from 'react'
import { buyUrl } from '../../lib/baum'
import { walletTokens, type TokenAnswer } from '../../lib/social'
import { money, price, tone } from '../../lib/terminal-format'
import Icon from './Icon'
import { Callout, CopyButton } from './ui'

type Kind = 'launched' | 'traded'
type Row = { address: string; symbol: string; name: string; priceUsd?: number | null; marketCapUsd?: number | null; pnlUsd?: number | null }

/** The tokens a wallet launched or traded on chain, from Baum. Contracts show in full. */
export default function TokensSection({ wallet }: { wallet: string }) {
  const [kind, setKind] = useState<Kind>('traded')
  const [answers, setAnswers] = useState<Partial<Record<Kind, TokenAnswer | 'loading'>>>({})
  const answer = answers[kind]
  useEffect(() => {
    if (answers[kind] !== undefined) return
    setAnswers((previous) => ({ ...previous, [kind]: 'loading' }))
    walletTokens(wallet, kind).then((found) => setAnswers((previous) => ({ ...previous, [kind]: found })))
  }, [wallet, kind, answers])

  // Until Baum shares a wallet's tokens there's nothing to list, so the section stays out
  // of the way; the profile's stats show how many tokens it traded.
  if (answer && answer !== 'loading' && answer.pending) return null
  return <section className="t-feature-card t-tokens-section">
    <div className="t-section-title"><span className="t-section-icon"><Icon name="globe" /></span><h2>Tokens</h2>
      <div className="t-segments" role="group" aria-label="Launched or traded">
        {(['traded', 'launched'] as Kind[]).map((item) => <button type="button" key={item} aria-pressed={kind === item} onClick={() => setKind(item)}>{item === 'traded' ? 'Traded' : 'Launched'}</button>)}
      </div>
    </div>
    {answer === 'loading' && <p className="t-muted" role="status">Loading tokens…</p>}
    {answer === null && <Callout error onRetry={() => setAnswers((previous) => ({ ...previous, [kind]: undefined }))}>Couldn’t load tokens from Baum.</Callout>}
    {answer && answer !== 'loading' && answer.pending && <p className="t-muted">Tokens launched and traded on chain show here once Baum shares them. Search any token by its contract address in the meantime.</p>}
    {answer && answer !== 'loading' && !answer.pending && !answer.tokens.length && <p className="t-muted">{kind === 'traded' ? 'No tokens traded yet.' : 'No tokens launched yet.'}</p>}
    {answer && answer !== 'loading' && answer.tokens.length > 0 && <div className="t-token-rows">
      {(answer.tokens as Row[]).map((token) => <div className="t-token-row" key={token.address}>
        <span className="t-token-badge" aria-hidden="true">{token.symbol.slice(0, 2)}</span>
        <span className="t-token-info">
          <a href={buyUrl(token.address)} target="_blank" rel="noreferrer"><strong>${token.symbol}</strong> <span className="t-faint">{token.name}</span></a>
          <span className="t-token-contract"><span className="t-mono">{token.address}</span><CopyButton value={token.address} label="Copy contract address" /></span>
        </span>
        <span className="t-token-side">{typeof token.pnlUsd === 'number' ? <span className={tone(token.pnlUsd)}>{money(token.pnlUsd, true)}</span> : price(token.priceUsd)}<small>{token.marketCapUsd ? `MC ${money(token.marketCapUsd).replace(/\.\d+$/, '')}` : ''}</small></span>
      </div>)}
    </div>}
  </section>
}
