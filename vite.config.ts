import { fileURLToPath } from 'node:url'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
// Anything imported by this config is also loaded by Vite's native config
// loader, which needs explicit extensions (and no directory indexes).
import { navItems } from './src/data/navigation.ts'
import { pageMeta } from './src/data/pages.ts'
import { profile } from './src/data/profile.ts'
import { projects } from './src/data/projects.ts'
import { ACCENT_STORAGE_KEY, accentPalettes, DEFAULT_ACCENT } from './src/lib/appearance.ts'
import { PREFERENCES_STORAGE_KEY } from './src/lib/preferences.ts'
import { SITE_DESCRIPTION, SITE_ORIGIN, SITE_TITLE } from './src/lib/seo.ts'
import {
  createCheckAvailabilityTool,
  createGetContactTool,
  createGetProfileTool,
  createGetProjectTool,
  createListProjectsTool,
} from './src/lib/webmcp/index.ts'

const LOCAL_PREVIEW_ORIGIN = 'http://localhost:4173'

const agentTools = [
  createGetProfileTool(profile),
  createListProjectsTool(projects),
  createGetProjectTool(projects),
  createCheckAvailabilityTool(profile),
  createGetContactTool(profile),
]

function resolveSiteOrigin() {
  const configured = process.env.SITE_URL?.trim()
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  const value = configured || (vercel ? `https://${vercel}` : LOCAL_PREVIEW_ORIGIN)
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`

  return new URL(withProtocol).origin
}

/**
 * ARD spec version accepted by the conformance tester. The manifest schema
 * requires this member, and the legacy ai-catalog validator reads it too.
 */
const ARD_SPEC_VERSION = '1.0'

/**
 * One entry describing the agent-facing catalog. `type` is a standard ARD
 * discovery media type, so the conformance tester raises no diagnostics.
 */
function createManifestEntry(origin: string) {
  const publisher = new URL(origin).hostname

  return {
    identifier: `urn:air:${publisher}:portfolio:website`,
    displayName: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: 'application/ai-catalog+json',
    url: `${origin}/agent-catalog.json`,
    representativeQueries: [
      `Who is ${profile.name}?`,
      `What projects has ${profile.firstName} built?`,
      `What technologies does ${profile.firstName} work with?`,
      `How can I contact ${profile.firstName}?`,
    ],
    capabilities: agentTools.map((tool) => tool.name),
    tags: ['portfolio', 'full-stack', 'webmcp', 'react', 'typescript'],
  }
}

/**
 * ARD manifest. Served at `/.well-known/ard.json` and, for consumers that still
 * look for the predecessor name, at `/.well-known/ai-catalog.json`.
 */
function createArdManifest(origin: string) {
  return {
    specVersion: ARD_SPEC_VERSION,
    entries: [createManifestEntry(origin)],
  }
}

/**
 * The resource the ARD entry points at. It carries the same ARD core so it also
 * validates as a manifest, plus the site-catalog members (`pages`, `tools`)
 * that ARD ignores as transport-defined.
 */
function createSiteCatalog(origin: string) {
  const pageDescriptions: Partial<Record<string, string>> = {
    '/': pageMeta.home.description,
    '/projects': pageMeta.projects.description,
    '/about': pageMeta.about.description,
    '/contact': pageMeta.contact.description,
    '/chat': pageMeta.chat.description,
    '/more': pageMeta.more.description,
  }

  return {
    ...createArdManifest(origin),
    name: `${profile.name} Portfolio`,
    url: `${origin}/`,
    description: `${SITE_DESCRIPTION.replace(/\.$/, '')}. Includes project summaries, technical stack, contact details, and ${agentTools.length} read-only WebMCP tools.`,
    pages: navItems.map((item) => ({
      title: item.label,
      path: item.to,
      description: pageDescriptions[item.to] ?? '',
    })),
    tools: agentTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    })),
  }
}

const manifestEntries = [
  { fileName: '.well-known/ard.json', catalog: false },
  { fileName: '.well-known/ai-catalog.json', catalog: false },
  { fileName: 'agent-catalog.json', catalog: true },
] as const

function agentManifestPlugin(): Plugin {
  const payload = (origin: string, catalog: boolean) =>
    `${JSON.stringify(catalog ? createSiteCatalog(origin) : createArdManifest(origin), null, 2)}\n`

  return {
    name: 'agent-manifest',
    configureServer(server) {
      const origin = `http://localhost:${server.config.server.port ?? 5173}`

      server.middlewares.use((request, response, next) => {
        const path = (request.url?.split('?')[0] ?? '').replace(/^\//, '')
        const entry = manifestEntries.find((candidate) => candidate.fileName === path)

        if (!entry) {
          next()
          return
        }

        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(payload(origin, entry.catalog))
      })
    },
    generateBundle() {
      const origin = resolveSiteOrigin()

      for (const entry of manifestEntries) {
        this.emitFile({
          type: 'asset',
          fileName: entry.fileName,
          source: payload(origin, entry.catalog),
        })
      }
    },
  }
}

/**
 * Generates the pre-paint boot script and the document head from the same
 * constants the app uses, so the HTML shell cannot drift from the router head.
 */
function createHeadPlugin(): Plugin {
  return {
    name: 'document-head',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const OG_IMAGE_URL = `${SITE_ORIGIN}/og-image.png`
        const palettes = Object.fromEntries(
          accentPalettes.map((palette) => [
            palette.id,
            { dark: palette.dark, light: palette.light },
          ]),
        )
        const boot = [
          '(() => {',
          `  var paletteKey = ${JSON.stringify(PREFERENCES_STORAGE_KEY)}`,
          `  var legacyAccentKey = ${JSON.stringify(ACCENT_STORAGE_KEY)}`,
          `  var fallbackAccent = ${JSON.stringify(DEFAULT_ACCENT)}`,
          `  var palettes = ${JSON.stringify(palettes)}`,
          '  try {',
          "    var theme = localStorage.getItem('theme') === 'light' ? 'light' : 'dark'",
          '    if (theme === "light") {',
          '      document.documentElement.dataset.theme = "light"',
          '      var themeColor = document.querySelector("meta[name=theme-color]")',
          '      if (themeColor) themeColor.setAttribute("content", "#f5f3ec")',
          '    }',
          '    var stored = localStorage.getItem(paletteKey)',
          '    var parsed = stored ? JSON.parse(stored) : null',
          '    var accent = parsed && parsed.accent ? parsed.accent : localStorage.getItem(legacyAccentKey)',
          '    if (!palettes[accent]) accent = fallbackAccent',
          '    var colors = palettes[accent][theme]',
          '    document.documentElement.dataset.accent = accent',
          '    document.documentElement.style.setProperty("--color-accent", colors.accent)',
          '    document.documentElement.style.setProperty("--color-accent-ink", colors.ink)',
          '  } catch (error) {',
          '    // Default palette stays applied when storage is unavailable.',
          '  }',
          '})()',
        ].join('\n')

        return html
          .replaceAll('%SITE_TITLE%', SITE_TITLE)
          .replaceAll('%SITE_DESCRIPTION%', SITE_DESCRIPTION)
          .replaceAll('%SITE_ORIGIN%', SITE_ORIGIN)
          .replaceAll('%OG_IMAGE%', OG_IMAGE_URL)
          .replace("void '%ACCENT_BOOT%'", boot)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    agentManifestPlugin(),
    createHeadPlugin(),
  ],
})
