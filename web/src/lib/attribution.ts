import { FEES } from '../config'

// Vault deposit attribution. A depositor who lands on an agent page from an operator's own
// link (`?via=<anything>`) is "direct" and the platform takes the lower share; one who found
// the vault by browsing this platform is "discovered" and the platform takes the higher one.
// Recorded per vault on first landing. This is client-side only until deposits are on-chain
// (see TODO.md), where the source has to travel with the deposit itself.

const key = (agentId: string) => `atp-via-${agentId.toLowerCase()}`

export function recordLanding(agentId: string, search: string) {
  try {
    if (new URLSearchParams(search).has('via') && !sessionStorage.getItem(key(agentId))) {
      sessionStorage.setItem(key(agentId), 'direct')
    }
  } catch {
    // storage unavailable: treat as discovered
  }
}

export function depositSource(agentId: string): 'direct' | 'discovered' {
  try {
    return sessionStorage.getItem(key(agentId)) === 'direct' ? 'direct' : 'discovered'
  } catch {
    return 'discovered'
  }
}

export const platformShare = (source: 'direct' | 'discovered') =>
  source === 'direct' ? FEES.platformShareDirect : FEES.platformShareDiscovered

export const operatorLink = (agentId: string) =>
  `${location.origin}${import.meta.env.BASE_URL}agents/${agentId}?via=operator`
