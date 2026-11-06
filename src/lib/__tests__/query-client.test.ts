import { expect, it } from 'vitest'
import { queryClient } from '../query-client'

it('uses the portfolio cache defaults', () => {
  const queries = queryClient.getDefaultOptions().queries

  expect(queries?.staleTime).toBe(5 * 60_000)
  expect(queries?.gcTime).toBe(30 * 60_000)
  expect(queries?.refetchOnWindowFocus).toBe(false)
  expect(queries?.retry).toBe(1)
})
