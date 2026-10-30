// Guest passes from invite links (slugs.run/<code>). The pass is an httpOnly cookie set
// by api/invite.js, good for 7 days; these calls only ask about it. See api/invite.js.
import { SignInError } from './auth'

const url = `${import.meta.env.BASE_URL}api/invite`

export type GuestPass = {
  /** The invite code, as it was opened or typed. */
  code: string
  /** Who invited them: the inviter's Baum username, when they have one. */
  from: string | null
  /** When the pass runs out (ms). */
  expiresAt: number
}

async function reasonOf(response: Response) {
  const body = (await response.json().catch(() => null)) as { reason?: string } | null
  return body?.reason ?? `http-${response.status}`
}

/** The visitor's guest pass, or null. */
export async function currentPass(): Promise<GuestPass | null> {
  const response = await fetch(url, { credentials: 'same-origin' }).catch(() => null)
  return response?.ok ? response.json() : null
}

/** Checks an invite code with Baum and, for a real one, gives a guest pass. */
export async function acceptInvite(code: string): Promise<GuestPass> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!response.ok) throw new SignInError(await reasonOf(response))
  return response.json()
}

/** Invite failures in plain words. */
export function inviteMessage(err: unknown) {
  switch ((err as { reason?: string } | null)?.reason) {
    case 'unknown-code':
    case 'bad-code':
      return 'That invite code isn’t valid. Check it with whoever sent it.'
    case 'apply':
      return 'That’s SLUGS’ own code, not an invite. Ask a friend for theirs, or enter the raffle below.'
    case 'baum-unavailable':
      return 'Couldn’t reach Baum to check the code. Try again in a minute.'
    case 'not-configured':
      return 'Invites aren’t set up on this site yet.'
    default:
      return 'Something went wrong. Try again.'
  }
}

/** "6 days", "1 day", "less than a day". */
export function timeLeft(pass: GuestPass) {
  const days = Math.floor((pass.expiresAt - Date.now()) / 86_400_000)
  return days >= 2 ? `${days} days` : days === 1 ? '1 day' : 'less than a day'
}
