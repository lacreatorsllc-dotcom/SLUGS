import { useCallback, useEffect, useState } from 'react'
import { CHAIN } from '../config'
import { chainId, chooseAccount, connect, currentWallet, disconnect, onWallets, reconnect, switchToChain, watchWallet, wallets, type WalletOption } from './wallet'

const cancelled = (err: unknown) => (err as { code?: number }).code === 4001

/**
 * The connected browser wallet for a page: which wallets are installed, the
 * account and network in use, and connect / change / disconnect. A wallet
 * picked on an earlier visit is reconnected without a prompt.
 */
export function useWallet() {
  const [options, setOptions] = useState<WalletOption[]>(wallets)
  const [account, setAccount] = useState('')
  const [chain, setChain] = useState<number | null>(null)
  const [wallet, setWallet] = useState<WalletOption | undefined>(currentWallet)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => onWallets(() => setOptions(wallets())), [])
  // Wallets announce a moment after load, so this runs again as they do.
  useEffect(() => {
    let live = true
    if (!account) reconnect().then(async (found) => {
      if (!live || !found) return
      setAccount(found); setWallet(currentWallet())
      setChain(await chainId().catch(() => null))
    })
    return () => { live = false }
  }, [options.length, account])
  useEffect(() => account ? watchWallet((next) => { setAccount(next); if (!next) setChain(null) }, setChain) : undefined, [account, wallet?.id])

  const run = useCallback(async (step: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await step() }
    catch (err) { setError(cancelled(err) ? 'You cancelled in your wallet.' : (err as Error).message) }
    finally { setBusy(false) }
  }, [])

  return {
    options, account, chain, wallet, busy, error,
    onChain: chain === CHAIN.id,
    connect: (id?: string) => run(async () => {
      const next = await connect(id)
      setAccount(next); setWallet(currentWallet()); setChain(await chainId())
    }),
    chooseAccount: () => run(async () => { const next = await chooseAccount(); if (next) setAccount(next) }),
    switchChain: () => run(async () => { await switchToChain(); setChain(await chainId()) }),
    disconnect: () => run(async () => { await disconnect(); setAccount(''); setChain(null); setWallet(undefined) }),
  }
}
