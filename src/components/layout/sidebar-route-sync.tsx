import { useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useSidebar } from './sidebar-context'

export function SidebarRouteSync() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { close } = useSidebar()

  useEffect(() => {
    close()
  }, [close, pathname])

  return null
}
