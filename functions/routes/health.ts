import { Hono } from 'hono'

export const healthRouter = new Hono().get('/api/health', (context) => context.json({ ok: true }))
