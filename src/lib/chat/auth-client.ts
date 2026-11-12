import { createAuthClient } from '@neon/auth'
import { BetterAuthReactAdapter } from '@neon/auth/react/adapters'

const configuredAuthUrl = import.meta.env.VITE_NEON_AUTH_URL
const authUrl = (configuredAuthUrl ?? 'http://localhost:5173').replace(/\/$/, '')

if (!configuredAuthUrl) {
  console.warn('VITE_NEON_AUTH_URL is not configured')
}

export const authClient = createAuthClient(authUrl, {
  adapter: BetterAuthReactAdapter({
    fetchOptions: { credentials: 'include' },
  }),
})
