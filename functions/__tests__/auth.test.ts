import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => ({ mocked: true })),
  jwtVerify: vi.fn(),
}))

import { jwtVerify } from 'jose'
import { requireAuth } from '../chat/auth'
import { ApiError } from '../chat/errors'

const mockedVerify = vi.mocked(jwtVerify)

describe('requireAuth', () => {
  beforeEach(() => {
    vi.stubEnv('NEON_AUTH_BASE_URL', 'https://auth.example.com/neondb/auth')
    vi.stubEnv(
      'NEON_AUTH_JWKS_URL',
      'https://auth.example.com/neondb/auth/.well-known/jwks.json',
    )
    mockedVerify.mockReset()
  })

  it('rejects a request without a bearer token', async () => {
    await expect(
      requireAuth(new Request('https://api.example.com/api/me')),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
  })

  it('rejects a malformed authorization header', async () => {
    const request = new Request('https://api.example.com/api/me', {
      headers: { authorization: 'Basic abc' },
    })
    await expect(requireAuth(request)).rejects.toBeInstanceOf(ApiError)
  })

  it('returns the subject from a valid token', async () => {
    mockedVerify.mockResolvedValue({
      payload: { sub: 'auth-user-1' },
      protectedHeader: { alg: 'EdDSA' },
    } as never)

    const request = new Request('https://api.example.com/api/me', {
      headers: { authorization: 'Bearer valid-token' },
    })
    await expect(requireAuth(request)).resolves.toEqual({
      authUserId: 'auth-user-1',
      token: 'valid-token',
    })
  })

  it('rejects a token without a subject', async () => {
    mockedVerify.mockResolvedValue({
      payload: {},
      protectedHeader: { alg: 'EdDSA' },
    } as never)

    const request = new Request('https://api.example.com/api/me', {
      headers: { authorization: 'Bearer valid-token' },
    })
    await expect(requireAuth(request)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })
})
