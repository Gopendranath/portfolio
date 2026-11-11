import type {} from 'react'

/**
 * WebMCP declarative annotations. The browser turns an annotated `<form>` into a
 * tool; React passes unknown lowercase attributes straight through, but the JSX
 * types have to know about them.
 *
 * https://developer.chrome.com/docs/ai/webmcp/declarative-api
 */
declare module 'react' {
  interface FormHTMLAttributes<T> {
    toolname?: string
    tooldescription?: string
    toolautosubmit?: boolean
  }

  interface TextareaHTMLAttributes<T> {
    toolparamdescription?: string
  }

  interface InputHTMLAttributes<T> {
    toolparamdescription?: string
  }

  interface SelectHTMLAttributes<T> {
    toolparamdescription?: string
  }
}
