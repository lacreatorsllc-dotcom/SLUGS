import type { BaumProfile } from './auth-context'

// SLUGS accounts sit on Baum accounts. The session lives in an httpOnly cookie set by
// api/session.js; these calls only ask it who's signed in. See api/session.js for the flow.
const url = `${import.meta.env.BASE_URL}api/session`

export class SignInError extends Error {
  readonly reason: string
  constructor(reason: string) {
    super(reason)
    this.reason = reason
  }
}

async function reasonOf(response: Response) {
  const body = (await response.json().catch(() => null)) as { reason?: string } | null
  return body?.reason ?? `http-${response.status}`
}

/** Who is signed in, or null. Throws when it can't tell (offline, Baum down). */
export async function currentProfile(): Promise<BaumProfile | null> {
  const response = await fetch(url, { credentials: 'same-origin' })
  if (response.status === 401) return null
  if (!response.ok) throw new SignInError(await reasonOf(response))
  return response.json()
}

/** Trades the one-time code from Baum's sign-in button for a session. */
export async function redeem(code: string): Promise<BaumProfile> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!response.ok) throw new SignInError(await reasonOf(response))
  return response.json()
}

export async function endSession() {
  const response = await fetch(url, { method: 'DELETE', credentials: 'same-origin' })
  if (!response.ok) throw new SignInError(await reasonOf(response))
}

/**
 * The one-time code in a sign-in link from Baum (…/connect-baum?code=…), or a bare
 * code; null for anything else, like an invite code. Telegram opens Baum's Sign in
 * button in its own browser on phones, so people paste the link into their usual one.
 */
export function signInCodeFrom(input: string): string | null {
  const text = input.trim()
  const fromLink = /[?&]code=([A-Za-z0-9_-]{20,100})(?:[&#]|$)/.exec(text)?.[1]
  if (fromLink) return fromLink
  return /^[A-Za-z0-9_-]{20,100}$/.test(text) ? text : null
}

/** Sign-in failures in plain words. */
export function signInMessage(err: unknown) {
  switch ((err as { reason?: string } | null)?.reason) {
    case 'bad-code':
    case 'expired-code':
      return 'That sign-in link has expired or was already used. Get a new one from Baum.'
    case 'not-configured':
      return 'Sign-in isn’t set up on this site yet.'
    case 'baum-unavailable':
      return 'Couldn’t reach Baum. Try again in a minute.'
    default:
      return 'Something went wrong. Try again.'
  }
}
