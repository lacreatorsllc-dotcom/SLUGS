import { TOKEN_CONTRACT_ADDRESS, TOKEN_EXPLORER_URL } from '../lib/token.js'

export default function TokenLaunchBanner({ tokenUrl = TOKEN_EXPLORER_URL } = {}) {
  const TokenAction = tokenUrl ? 'a' : 'button'

  return (
    <aside
      aria-label="Token launch announcement"
      className="border-b border-green/15 bg-gradient-to-r from-green/10 via-green/5 to-green/5"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex shrink-0 items-center gap-2 font-mono text-xs font-medium text-green">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green" />
            <span><span className="hidden sm:inline">TOKEN </span>LIVE</span>
          </span>
          <p className="text-xs text-white/90">
            Now on <span className="font-semibold text-green">Robinhood Chain</span>
          </p>
        </div>

        <TokenAction
          href={tokenUrl}
          type={tokenUrl ? undefined : 'button'}
          disabled={!tokenUrl}
          target={tokenUrl ? '_blank' : undefined}
          rel={tokenUrl ? 'noopener noreferrer' : undefined}
          aria-label={`View token contract ${TOKEN_CONTRACT_ADDRESS} on Robinhood Chain`}
          title={tokenUrl ? undefined : 'Preview — the token link will be added with the contract address'}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-1 text-xs font-semibold text-green transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-default"
        >
          View token
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </TokenAction>
      </div>
    </aside>
  )
}
