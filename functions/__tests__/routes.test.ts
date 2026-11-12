import { describe, expect, it } from 'vitest'
import app from '../api'

const protectedRoutes = [
  ['GET', '/api/me'],
  ['POST', '/api/chat/assistant'],
  ['POST', '/api/chat/assistant/edit'],
  ['POST', '/api/chat/assistant/retry'],
  ['POST', '/api/chat/owner'],
  ['POST', '/api/chat/owner/retry'],
  ['GET', '/api/conversations/assistant'],
  ['GET', '/api/conversations/assistant/messages'],
  ['DELETE', '/api/conversations/00000000-0000-4000-8000-000000000000'],
  ['PATCH', '/api/messages/00000000-0000-4000-8000-000000000000'],
  ['POST', '/api/conversations/owner/read'],
  ['POST', '/api/conversations/owner/unread'],
  ['POST', '/api/conversations/00000000-0000-4000-8000-000000000000/read'],
  ['GET', '/api/owner/threads'],
  ['GET', '/api/owner/threads/00000000-0000-4000-8000-000000000000/messages'],
  ['POST', '/api/owner/threads/00000000-0000-4000-8000-000000000000/messages'],
  ['POST', '/api/owner/threads/00000000-0000-4000-8000-000000000000/read'],
  ['POST', '/api/owner/threads/00000000-0000-4000-8000-000000000000/unread'],
] as const

describe('api routes', () => {
  it('serves health without auth', async () => {
    const response = await app.request('/api/health')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('handles CORS preflight', async () => {
    const response = await app.request('/api/me', { method: 'OPTIONS' })
    expect(response.status).toBe(204)
  })

  for (const [method, path] of protectedRoutes) {
    it(`${method} ${path} requires auth`, async () => {
      const response = await app.request(path, { method })
      expect(response.status).toBe(401)
    })
  }
})
