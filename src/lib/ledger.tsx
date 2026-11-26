import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { clearPassword, readPassword, writePassword } from '@/lib/session'
import { ledgerClient } from '@/lib/sheets-client'

type LedgerContextValue = {
  mode: 'mock' | 'script'
  password: string | null
  unlock: (password: string) => Promise<void>
  lock: () => void
}

const LedgerContext = createContext<LedgerContextValue | null>(null)

export function LedgerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [password, setPassword] = useState<string | null>(() => readPassword())

  const unlock = useCallback(async (next: string) => {
    await ledgerClient.login(next)
    writePassword(next)
    setPassword(next)
  }, [])

  const lock = useCallback(() => {
    clearPassword()
    setPassword(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({ mode: ledgerClient.mode, password, unlock, lock }),
    [password, unlock, lock],
  )

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export function useLedger() {
  const context = useContext(LedgerContext)
  if (!context) throw new Error('useLedger phải nằm trong LedgerProvider')
  return context
}
