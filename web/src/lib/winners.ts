import { useEffect, useState } from 'react'

// Last week's top 3, recorded by the Pages job each Monday 00:00 UTC (scripts/fetch-leaderboard.mjs).
export type WinnerWeek = {
  weekStart: number
  weekEnd: number
  top: { wallet: string; username?: string; pnlUsd: number; volumeUsd: number; trades: number }[]
}

export function useWinners() {
  const [weeks, setWeeks] = useState<WinnerWeek[] | null>(null)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/winners.json`)
      .then((r) => (r.ok ? r.json() : { weeks: [] }))
      .then((w) => setWeeks(w.weeks ?? []))
      .catch(() => setWeeks([]))
  }, [])
  return weeks
}

/** The next snapshot: the coming Monday, 00:00 UTC. */
export function nextSnapshot(now = Date.now()) {
  const d = new Date(now)
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return today + (((8 - d.getUTCDay()) % 7) || 7) * 86_400_000
}
