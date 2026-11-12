import { attachDatabasePool } from '@neon/functions'
import { Pool } from 'pg'

let pool: Pool | undefined

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured')
    }
    pool = new Pool({ connectionString, max: 5 })
    attachDatabasePool(pool)
  }
  return pool
}
