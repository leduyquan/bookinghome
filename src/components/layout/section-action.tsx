import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

const SectionActionContext = createContext<(action: ReactNode) => void>(() => {})

export function SectionActionProvider({ children }: { children: (action: ReactNode) => ReactNode }) {
  const [action, setAction] = useState<ReactNode>(null)
  return <SectionActionContext.Provider value={setAction}>{children(action)}</SectionActionContext.Provider>
}

export function useSectionAction(action: ReactNode) {
  const setAction = useContext(SectionActionContext)
  useLayoutEffect(() => {
    setAction(action)
    return () => setAction(null)
  }, [action, setAction])
}
