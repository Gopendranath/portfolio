import { defineConfig } from '@neon/config/v1'

export default defineConfig({
  auth: true,
  functions: {
    api: {
      name: 'Portfolio Chat API',
      source: './functions/api.ts',
      env: {
        OPENROUTER_API_KEY: {
          value: process.env.OPENROUTER_API_KEY,
          required: true,
        },
        OWNER_GITHUB_ID: {
          value: process.env.OWNER_GITHUB_ID ?? '71755844',
          required: true,
        },
        CORS_ORIGINS: {
          value:
            process.env.CORS_ORIGINS ??
            'http://localhost:5173,http://127.0.0.1:5173,https://gopendra.is-a.dev,https://portfolio-zeta-coral-18.vercel.app',
          required: true,
        },
      },
    },
  },
})
