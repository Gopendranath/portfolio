import { createContext, useContext } from 'react'

export interface SidebarContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = useContext(SidebarContext)

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }

  return context
}
