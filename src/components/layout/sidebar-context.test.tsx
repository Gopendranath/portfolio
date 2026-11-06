import { act, renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SidebarProvider, useSidebar } from './sidebar-context'

it('opens, toggles, and closes the drawer', () => {
  const { result } = renderHook(() => useSidebar(), {
    wrapper: SidebarProvider,
  })

  expect(result.current.isOpen).toBe(false)

  act(() => result.current.open())
  expect(result.current.isOpen).toBe(true)

  act(() => result.current.toggle())
  expect(result.current.isOpen).toBe(false)

  act(() => result.current.open())
  act(() => result.current.close())
  expect(result.current.isOpen).toBe(false)
})
