import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

// `neon.ts` reads function env from `process.env` at config load, before the
// CLI applies `--env`. Pre-load the same file into `process.env` (without
// overriding real exports) so required vars like OPENROUTER_API_KEY resolve.
const envIndex = process.argv.indexOf('--env')
const envFile = envIndex === -1 ? '.env.local' : (process.argv[envIndex + 1] ?? '.env.local')

if (envIndex === -1) {
  process.argv.push('--env', envFile)
}

let source
try {
  source = await readFile(envFile, 'utf8')
} catch {
  console.error(`${envFile} not found`)
  process.exit(1)
}

for (const line of source.split('\n')) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
  if (!match) {
    continue
  }
  let value = match[2]
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1)
  }
  if (!(match[1] in process.env)) {
    process.env[match[1]] = value
  }
}

const result = spawnSync('npx', ['neon', 'deploy', '--env', envFile], {
  stdio: 'inherit',
  shell: true,
})
process.exit(result.status ?? 1)
