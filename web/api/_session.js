// Shared by the sign-in functions: Baum's partner endpoints and the session cookie.
// The cookie holds Baum's session token (POST /api/partner/session); it is httpOnly,
// so the page never sees it, and every read goes through /api/me with SLUGS' key.

export const BAUM = process.env.BAUM_API ?? 'https://baumai.xyz'
export const COOKIE = 'slugs_session'
const MAX_AGE = 30 * 86_400

export function sessionFrom(req) {
  const found = String(req.headers.cookie ?? '')
    .split(';')
    .map((c) => c.trim().split('='))
    .find(([name]) => name === COOKIE)
  return found?.[1] ? decodeURIComponent(found[1]) : null
}

export const setCookie = (res, session) =>
  res.setHeader('set-cookie', `${COOKIE}=${encodeURIComponent(session)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`)

export const clearCookie = (res) => res.setHeader('set-cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`)

export function baum(path, init = {}) {
  const key = process.env.BAUM_API_KEY
  if (!key) return Promise.resolve(null)
  return fetch(`${BAUM}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', ...init.headers },
  }).catch(() => null)
}
