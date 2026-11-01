// Which addresses are invite links. Both spellings work on slugs.run, the same as on
// baumai.xyz (Winston, 2026-10-31): slugs.run/<code>, and ?ref=<code> on any page.
// Pure, so tests/invite-path.test.ts can hold the rules.

// The site's own top-level pages. Any other single segment that looks like a referral
// code is an invite link: slugs.run/<code>.
export const PAGES = new Set(['home', 'settings', 'leaderboard', 'agents', 'vaults', 'swap', 'token', 'burn', 'login', 'connect-baum', 'profile', 'deploy', 'paper'])
const CODE = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/
const INVITE_PATH = /^\/([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)$/

/** The code in slugs.run/<code>, or null for one of the site's pages or anything else. */
export function inviteFromPath(pathname: string): string | null {
  const code = INVITE_PATH.exec(pathname)?.[1]
  return code && !PAGES.has(code.toLowerCase()) ? code : null
}

/**
 * Where ?ref=<code> sends a visitor: the same invite page as slugs.run/<code>, with the
 * ref taken out of the address and anything else kept (?inv= for a personal
 * invitation). Null when there is no usable ref.
 */
export function refRedirect(search: string): string | null {
  const params = new URLSearchParams(search)
  const code = params.get('ref')?.trim()
  if (!code || code.length > 60 || !CODE.test(code) || PAGES.has(code.toLowerCase())) return null
  params.delete('ref')
  const rest = params.toString()
  return `/${code}${rest ? `?${rest}` : ''}`
}
