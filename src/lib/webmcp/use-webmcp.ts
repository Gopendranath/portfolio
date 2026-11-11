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
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
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

type ModelContext = WebMCP.ModelContext

/**
 * One shared poll for the late-injected `document.modelContext`, instead of one
 * interval per registered tool (there are five).
 */
const modelContextWaiters = new Set<() => void>()
let watchingForModelContext = false

function watchForModelContext(onAppear: () => void) {
  if (typeof document === 'undefined' || document.modelContext) {
    return () => {}
  }

  modelContextWaiters.add(onAppear)

  if (!watchingForModelContext) {
    watchingForModelContext = true
    let attempts = 0
    const timer = setInterval(() => {
      const appeared = Boolean(document.modelContext)
      attempts += 1

      if (appeared || attempts >= 20) {
        clearInterval(timer)
        watchingForModelContext = false

        if (appeared) {
          for (const notify of modelContextWaiters) {
            notify()
          }
          modelContextWaiters.clear()
        }
      }
    }, 500)
  }

  return () => modelContextWaiters.delete(onAppear)
}

/**
 * A tool can report failure by returning `{ error }` instead of throwing. That
 * still has to reach the agent as `isError`, or a failed lookup reads as data.
 */
function isErrorResult(value: unknown): boolean {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as { error?: unknown }).error === 'string'
  )
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

  return { content: [{ type: 'text', text: safeStringify(value) }] }
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
  const [state, setState] = useState<WebMcpToolState>(() => ({
    supported:
      typeof document !== 'undefined' && Boolean(document.modelContext),
    registered: false,
    error: null,
  }))

  const executeRef = useRef(execute)
  const formatOutputRef = useRef(formatOutput)
  const onErrorRef = useRef(onError)
  const inputSchemaRef = useRef(inputSchema)
  const annotationsRef = useRef(annotations)

  useEffect(() => {
    executeRef.current = execute
    formatOutputRef.current = formatOutput
    onErrorRef.current = onError
    inputSchemaRef.current = inputSchema
    annotationsRef.current = annotations
  })

  const schemaKey = useMemo(
    () => (inputSchema ? safeStringify(inputSchema) : ''),
    [inputSchema],
  )
  const annotationsKey = useMemo(
    () => (annotations ? safeStringify(annotations) : ''),
    [annotations],
  )

  const [detectTick, redetect] = useReducer((n: number) => n + 1, 0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: schemaKey and annotationsKey stand in for the ref-tracked inputSchema and annotations; detectTick forces re-registration after late API injection.
  useEffect(() => {
    const modelContext: ModelContext | undefined =
      typeof document === 'undefined' ? undefined : document.modelContext

    if (!modelContext) {
      if (typeof document === 'undefined') return

      return watchForModelContext(redetect)
    }

    if (!enabled) return

    let cancelled = false
    const controller = new AbortController()
    const commit = (next: WebMcpToolState) => {
      if (cancelled || controller.signal.aborted) return
      setState(next)
    }

    void (async () => {
      try {
        await modelContext.registerTool(
          {
            name,
            description,
            inputSchema: inputSchemaRef.current,
            annotations: annotationsRef.current,
            async execute(args, options) {
              let shaped: unknown
              try {
                const result = await executeRef.current(args as TInput, options)
                const format = formatOutputRef.current
                shaped = format ? format(result, args as TInput) : result
              } catch (error) {
                if (options.signal.aborted) throw error
                onErrorRef.current?.(error)
                return toErrorResponse(error)
              }

              if (shaped instanceof Error) {
                if (options.signal.aborted) throw shaped
                onErrorRef.current?.(shaped)
                return toErrorResponse(shaped)
              }

              if (isErrorResult(shaped)) {
                const response = toToolResponse(shaped)
                return { ...response, isError: true }
              }

              return toToolResponse(shaped)
            },
          },
          { signal: controller.signal },
        )

        commit({ supported: true, registered: true, error: null })
      } catch (error) {
        commit({
          supported: true,
          registered: false,
          error:
            error instanceof Error ? error : new Error(safeStringify(error)),
        })
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
      // Abort is the documented path; the explicit call covers builds that
      // ignore the signal, which would otherwise duplicate tools on remount.
      const unregister = (
        modelContext as ModelContext & {
          unregisterTool?: (name: string) => void
        }
      ).unregisterTool

      if (typeof unregister === 'function') {
        unregister.call(modelContext, name)
      }
    }
  }, [name, description, schemaKey, annotationsKey, enabled, detectTick])

  return enabled
    ? state
    : { supported: state.supported, registered: false, error: null }
}
