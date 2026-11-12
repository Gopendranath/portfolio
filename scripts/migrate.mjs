import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations')
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const client = new Client({ connectionString })
await client.connect()

try {
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()

  for (const file of files) {
    const { rowCount } = await client.query('select 1 from schema_migrations where name = $1', [
      file,
    ])

    if (rowCount) {
      console.log(`skip ${file}`)
      continue
    }

    const sql = await readFile(join(migrationsDir, file), 'utf8')
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('commit')
      console.log(`applied ${file}`)
    } catch (error) {
      await client.query('rollback')
      throw error
    }
  }
} finally {
  await client.end()
}
