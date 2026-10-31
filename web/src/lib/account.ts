// The signed-in person's Baum account settings, through api/account.js and Baum's
// partner account API. SLUGS signs people in with Baum, so these are kept with their
// Baum account, and a change here shows in Baum too.

export type Account = {
  username: string | null
  usernameChange: { canChange: boolean; changesLeft: number; nextChangeAt: string | null }
  avatarUrl: string | null
  email: string | null
  emailVerified: boolean
  personalWallet: string | null
  walletDetails: { address: string; label: string | null; agent: { name: string; slug: string | null; username: string | null; status: 'active' | 'stopped' } | null }[]
}

export async function call(body?: Record<string, unknown>) {
  const res = await fetch(`/api/account${body ? '' : '?action=me'}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
  }).catch(() => null)
  const json = res ? await res.json().catch(() => ({})) : {}
  return { ok: Boolean(res?.ok), json }
}

export const reasonText = (json: { reason?: unknown }) => (typeof json.reason === 'string' && json.reason.includes(' ') ? json.reason : 'That didn’t save. Try again.')
