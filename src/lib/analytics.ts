import { SITE_ORIGIN } from './seo'

const PRODUCTION_HOST = new URL(SITE_ORIGIN).hostname

/**
 * Vercel injects its insights script only on Vercel-served hosts. Loading the
 * component anywhere else logs a 404 the auditors flag, so mount it on the
 * production domain and on Vercel preview deployments only.
 */
export function shouldEnableAnalytics(hostname?: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const host = hostname ?? window.location.hostname

  return host === PRODUCTION_HOST || host.endsWith('.vercel.app')
}
