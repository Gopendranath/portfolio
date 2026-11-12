import type { Pool, PoolClient } from 'pg'
import { describe, expect, it } from 'vitest'
import { withTransaction } from '../chat/db'

function fakePool(calls: string[]): Pool {
  const client = {
    query: async (sql: string) => {
      calls.push(sql)
      return { rows: [] }
    },
    release: () => calls.push('release'),
  } as unknown as PoolClient

  return { connect: async () => client } as unknown as Pool
}

describe('withTransaction', () => {
  it('commits and returns the callback result', async () => {
    const calls: string[] = []
    const result = await withTransaction(fakePool(calls), async () => {
      calls.push('work')
      return 42
    })

    expect(result).toBe(42)
    expect(calls).toEqual(['begin', 'work', 'commit', 'release'])
  })

  it('rolls back and rethrows when the callback fails', async () => {
    const calls: string[] = []

    await expect(
      withTransaction(fakePool(calls), async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(calls).toEqual(['begin', 'rollback', 'release'])
  })
})
