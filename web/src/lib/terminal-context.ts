import { createContext, useContext } from 'react'
import type { TokenStats } from './token'
import type { Agent, BoardSet, LpRow, TraderRow } from './terminal-model'

export type Snapshot = {
  agents: Agent[]
  traders: BoardSet<TraderRow>
  lps: BoardSet<LpRow>
  token: TokenStats | null
  boardError: boolean
  partial: boolean
}
type DataState = { snapshot: Snapshot | null; loading: boolean; error: boolean; refresh: () => void }
export const TerminalDataContext = createContext<DataState | null>(null)

export function useTerminalData() {
  const context = useContext(TerminalDataContext)
  if (!context) throw new Error('TerminalDataProvider is missing')
  return context
}
