export function getAllowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function getCorsHeaders(request: Request): Headers {
  const headers = new Headers()
  const origin = request.headers.get('origin')

  if (origin && getAllowedOrigins().includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
    headers.set('Access-Control-Allow-Headers', 'authorization, content-type')
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
    headers.set('Access-Control-Max-Age', '86400')
  }

  return headers
}
