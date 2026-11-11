import { describe, expect, it } from 'vitest'
import { querySourceLabel } from '@/lib/query/status'

const base = {
  isFetching: false,
  isError: false,
  isPlaceholderData: false,
  hasData: true,
}

describe('querySourceLabel', () => {
  it('reports a live fetch as syncing', () => {
    expect(querySourceLabel({ ...base, isFetching: true })).toBe('Syncing…')
  })

  it('reports the bundled snapshot before any data resolves', () => {
    expect(querySourceLabel({ ...base, isError: true, hasData: false })).toBe(
      'Static snapshot',
    )
  })

  it('reports cached data when a refetch fails after a success', () => {
    expect(querySourceLabel({ ...base, isError: true })).toBe(
      'Cached GitHub data',
    )
  })

  it('reports placeholder data as a cached snapshot', () => {
    expect(querySourceLabel({ ...base, isPlaceholderData: true })).toBe(
      'Cached snapshot',
    )
  })

  it('reports a resolved fetch as live', () => {
    expect(querySourceLabel(base)).toBe('Live from GitHub')
  })
})
