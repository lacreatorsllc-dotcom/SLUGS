// The signed-in person's Baum profile, read with SLUGS' key and their session
// cookie (see session.js). 401 when signed out; the cookie is cleared when Baum no
// longer knows the session.

import { baum, clearCookie, sessionFrom } from './_session.js'

export default async function handler(req, res) {
  res.setHeader('cache-control', 'private, no-store')
  const session = sessionFrom(req)
  if (!session) return res.status(401).json({ signedIn: false })
  const answer = await baum('/api/partner/me', { headers: { 'x-baum-session': session } })
  if (answer?.status === 401) {
    clearCookie(res)
    return res.status(401).json({ signedIn: false })
  }
  if (!answer?.ok) return res.status(502).json({ error: 'Baum is not answering just now.' })
  return res.status(200).json(await answer.json())
}
