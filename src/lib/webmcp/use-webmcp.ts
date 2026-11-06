/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Vendored from the current upstream implementation:
 * https://github.com/GoogleChromeLabs/use-webmcp-tool/blob/main/useWebMCP.js
 */
import { useEffect, useReducer, useRef, useState } from 'react'
import type { WebMCP } from 'webmcp-types'

export type WebMcpToolResponse = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>
  isError?: boolean
}

export interface WebMcpToolOptions<TInput, TResult> {
  name: string
  description: string
  inputSchema?: object
  annotations?: WebMCP.ToolAnnotations
  execute: (
    input: TInput,
    options: { signal: AbortSignal },
  ) => TResult | Promise<TResult>
  enabled?: boolean
  formatOutput?: (result: TResult, input: TInput) => unknown
  onError?: (error: unknown) => void
}

export interface WebMcpToolState {
  supported: boolean
  registered: boolean
  error: Error | null
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function toToolResponse(value: unknown): WebMcpToolResponse {
  if (
    value &&
    typeof value === 'object' &&
    'content' in value &&
    Array.isArray((value as { content?: unknown }).content)
  ) {
    return value as WebMcpToolResponse
  }

  if (value === undefined || value === null) {
    return { content: [] }
  }

  if (typeof value === 'string') {
    return { content: [{ type: 'text', text: value }] }
  }

  return { content: [{ type: 'text', text: JSON.stringify(value) }] }
}

function toErrorResponse(error: unknown): WebMcpToolResponse {
  return {
    content: [{ type: 'text', text: errorMessage(error) }],
    isError: true,
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return typeof error === 'string' ? error : safeStringify(error)
}

export function useWebMCP<
  TInput extends object = Record<string, unknown>,
  TResult = unknown,
>({
  name,
  description,
  inputSchema,
  annotations,
  execute,
  enabled = true,
  formatOutput,
  onError,
}: WebMcpToolOptions<TInput, TResult>): WebMcpToolState {
  const [state, setState] = useState<WebMcpToolState>({
    supported: false,
    registered: false,
    error: null,
  })

  const executeRef = useRef(execute)
  const formatOutputRef = useRef(formatOutput)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    executeRef.current = execute
    formatOutputRef.current = formatOutput
    onErrorRef.current = onError
  })

  const schemaKey = inputSchema ? JSON.stringify(inputSchema) : ''
  const annotationsKey = annotations ? JSON.stringify(annotations) : ''

  const [detectTick, redetect] = useReducer((n: number) => n + 1, 0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: schemaKey and annotationsKey stand in for inputSchema and annotations; detectTick forces re-registration after late API injection.
  useEffect(() => {
    const modelContext =
      typeof document === 'undefined' ? undefined : document.modelContext

    if (!modelContext) {
      setState({ supported: false, registered: false, error: null })

      if (typeof document === 'undefined') return

      let attempts = 0
      const timer = setInterval(() => {
        if (document.modelContext) {
          clearInterval(timer)
          redetect()
        } else if (++attempts >= 20) {
          clearInterval(timer)
        }
      }, 500)

      return () => clearInterval(timer)
    }

    if (!enabled) {
      setState({ supported: true, registered: false, error: null })
      return
    }

    const controller = new AbortController()

    void (async () => {
      try {
        await modelContext.registerTool(
          {
            name,
            description,
            inputSchema,
            annotations,
            async execute(args, options) {
              try {
                const result = await executeRef.current(args as TInput, options)
                const format = formatOutputRef.current
                const shaped = format ? format(result, args as TInput) : result

                if (shaped instanceof Error) throw shaped
                return toToolResponse(shaped)
              } catch (error) {
                if (options.signal.aborted) throw error
                onErrorRef.current?.(error)
                return toErrorResponse(error)
              }
            },
          },
          { signal: controller.signal },
        )

        if (!controller.signal.aborted) {
          setState({ supported: true, registered: true, error: null })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            supported: true,
            registered: false,
            error:
              error instanceof Error ? error : new Error(safeStringify(error)),
          })
        }
      }
    })()

    return () => {
      controller.abort()
    }
  }, [name, description, schemaKey, annotationsKey, enabled, detectTick])

  return state
}
