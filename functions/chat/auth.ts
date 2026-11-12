import { createRemoteJWKSet, jwtVerify } from 'jose'
import { ApiError } from './errors'

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined

function parseAuthUrl(value: string, label: string): URL {
  try {
    return new URL(value)
  } catch {
    throw new ApiError('INTERNAL', `${label} is invalid`)
  }
}

function getJwks() {
  const url = process.env.NEON_AUTH_JWKS_URL
  if (!url) {
    throw new ApiError('INTERNAL', 'Auth JWKS URL is not configured')
  }
  const parsed = parseAuthUrl(url, 'Auth JWKS URL')
  jwks ??= createRemoteJWKSet(parsed)
  return jwks
}

function getIssuer() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL
  if (!baseUrl) {
    throw new ApiError('INTERNAL', 'Auth base URL is not configured')
  }
  return parseAuthUrl(baseUrl, 'Auth base URL').origin
}

export interface AuthUser {
  authUserId: string
  token: string
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const header = request.headers.get('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) {
    throw new ApiError('UNAUTHORIZED', 'Missing bearer token')
  }

  const token = header.slice(7).trim()
  if (!token) {
    throw new ApiError('UNAUTHORIZED', 'Missing bearer token')
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: getIssuer(),
    })

    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new ApiError('UNAUTHORIZED', 'Token has no subject')
    }

    return { authUserId: payload.sub, token }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('UNAUTHORIZED', 'Invalid or expired token')
  }
}
