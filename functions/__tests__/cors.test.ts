import { describe, expect, it } from 'vitest'
import { getCorsHeaders } from '../chat/cors'

describe('getCorsHeaders', () => {
  it('allows deleting assistant conversations', () => {
    const previous = process.env.CORS_ORIGINS
    process.env.CORS_ORIGINS = 'https://example.com'

    try {
      const headers = getCorsHeaders(
        new Request('https://api.example.com', {
          headers: { origin: 'https://example.com' },
        }),
      )

      expect(headers.get('Access-Control-Allow-Methods')).toContain('DELETE')
    } finally {
      if (previous === undefined) {
        delete process.env.CORS_ORIGINS
      } else {
        process.env.CORS_ORIGINS = previous
      }
    }
  })
})
