import tailwindcss from '@tailwindcss/vite'
import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const LOCAL_PREVIEW_ORIGIN = 'http://localhost:4173'

function resolveSiteOrigin() {
  const configured = process.env.SITE_URL?.trim()
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  const value =
    configured || (vercel ? `https://${vercel}` : LOCAL_PREVIEW_ORIGIN)
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`

  return new URL(withProtocol).origin
}

function createArdManifest(origin: string) {
  const publisher = new URL(origin).hostname

  return {
    // Required by Lighthouse's legacy ai-catalog validator; ignored by ARD.
    specVersion: '1.0',
    entries: [
      {
        identifier: `urn:air:${publisher}:portfolio:website`,
        displayName: 'Gopendranath Sasmal Portfolio',
        description:
          'Full-stack developer portfolio with project summaries, technical stack, contact details, and WebMCP tools.',
        type: 'application/ai-catalog+json',
        url: `${origin}/agent-catalog.json`,
        representativeQueries: [
          'Who is Gopendranath Sasmal?',
          'What projects has Gopendranath built?',
          'What technologies does Gopendranath work with?',
          'How can I contact Gopendranath?',
        ],
        capabilities: [
          'get-profile',
          'list-projects',
          'get-project',
          'check-availability',
          'get-contact',
        ],
        tags: ['portfolio', 'full-stack', 'webmcp', 'react', 'typescript'],
      },
    ],
  }
}

function ardManifestPlugin(): Plugin {
  return {
    name: 'ard-manifest',
    configureServer(server) {
      const origin = `http://localhost:${server.config.server.port ?? 5173}`

      const manifestPaths = new Set([
        '/.well-known/ard.json',
        '/.well-known/ai-catalog.json',
      ])

      server.middlewares.use((request, response, next) => {
        if (!manifestPaths.has(request.url?.split('?')[0] ?? '')) {
          next()
          return
        }

        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(`${JSON.stringify(createArdManifest(origin), null, 2)}\n`)
      })
    },
    generateBundle() {
      const origin = resolveSiteOrigin()
      const source = `${JSON.stringify(createArdManifest(origin), null, 2)}\n`

      for (const fileName of [
        '.well-known/ard.json',
        '.well-known/ai-catalog.json',
      ]) {
        this.emitFile({ type: 'asset', fileName, source })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    ardManifestPlugin(),
  ],
})
