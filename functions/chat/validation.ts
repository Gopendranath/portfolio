import type { z } from 'zod'
import { ApiError } from './errors'

const MAX_BODY_BYTES = 16 * 1024

export async function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  request: Request,
): Promise<z.infer<T>> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError('VALIDATION', 'Expected application/json')
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new ApiError('VALIDATION', 'Request body is too large')
  }

  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new ApiError('VALIDATION', 'Invalid JSON')
  }

  return schema.parse(value)
}
