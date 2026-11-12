import { authClient } from './auth-client'
import type { ApiErrorBody, SSEEvent } from './protocol'

const baseUrl = (import.meta.env.VITE_CHAT_API_URL ?? '').replace(/\/$/, '')

export class ChatApiError extends Error {
  readonly code: string
  readonly status: number
  readonly retryable: boolean

  constructor(body: ApiErrorBody | null, status: number) {
    super(body?.error.message ?? `Request failed with status ${status}`)
    this.name = 'ChatApiError'
    this.code = body?.error.code ?? 'INTERNAL'
    this.status = status
    this.retryable = body?.error.retryable ?? status >= 500
  }
}

export async function getSessionToken(): Promise<string> {
  const { data, error } = await authClient.getSession()
  const token = data?.session?.token

  if (error || !token) {
    throw new ChatApiError(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sign in to continue',
          retryable: false,
        },
      },
      401,
    )
  }

  return token
}

export async function chatFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const authToken = token ?? (await getSessionToken())
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      Authorization: `Bearer ${authToken}`,
    },
  })

  if (!response.ok) {
    let body: ApiErrorBody | null = null
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      body = null
    }
    throw new ChatApiError(body, response.status)
  }

  return (await response.json()) as T
}

export interface StreamHandlers {
  onMeta?: (data: Extract<SSEEvent, { event: 'meta' }>['data']) => void
  onDelta?: (text: string) => void
  onDone?: (data: Extract<SSEEvent, { event: 'done' }>['data']) => void
  onError?: (data: Extract<SSEEvent, { event: 'error' }>['data']) => void
}

export async function streamChat(
  path: string,
  body: unknown,
  handlers: StreamHandlers,
  signal?: AbortSignal,
  token?: string,
): Promise<void> {
  const authToken = token ?? (await getSessionToken())
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    let errorBody: ApiErrorBody | null = null
    try {
      errorBody = (await response.json()) as ApiErrorBody
    } catch {
      errorBody = null
    }
    const error = new ChatApiError(errorBody, response.status)
    handlers.onError?.({
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    })
    return
  }

  if (!response.body) {
    handlers.onError?.({
      code: 'UPSTREAM_ERROR',
      message: 'The assistant returned no stream',
      retryable: true,
    })
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let terminal = false
  const wrapped: StreamHandlers = {
    onMeta: handlers.onMeta,
    onDelta: handlers.onDelta,
    onDone: (data) => {
      terminal = true
      handlers.onDone?.(data)
    },
    onError: (data) => {
      terminal = true
      handlers.onError?.(data)
    },
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      dispatchFrame(frame, wrapped)
      boundary = buffer.indexOf('\n\n')
    }
  }

  if (!terminal) {
    wrapped.onError?.({
      code: 'STREAM_INTERRUPTED',
      message: 'The response was interrupted.',
      retryable: true,
    })
  }
}

function dispatchFrame(frame: string, handlers: StreamHandlers): void {
  let event = ''
  const dataLines: string[] = []

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }

  if (!event || dataLines.length === 0) {
    return
  }

  let data: unknown
  try {
    data = JSON.parse(dataLines.join('\n'))
  } catch {
    return
  }

  if (event === 'meta') {
    handlers.onMeta?.(
      data as Parameters<NonNullable<StreamHandlers['onMeta']>>[0],
    )
  } else if (event === 'delta') {
    const text = (data as { text?: unknown }).text
    if (typeof text === 'string') {
      handlers.onDelta?.(text)
    }
  } else if (event === 'done') {
    handlers.onDone?.(
      data as Parameters<NonNullable<StreamHandlers['onDone']>>[0],
    )
  } else if (event === 'error') {
    handlers.onError?.(
      data as Parameters<NonNullable<StreamHandlers['onError']>>[0],
    )
  }
}
