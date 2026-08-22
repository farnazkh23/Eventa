const LOCAL_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const ALLOWED_METHODS = 'GET, POST, OPTIONS'
const ALLOWED_HEADERS = 'Content-Type, X-Request-Id'

function configuredOrigin(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

export function corsResponseHeaders(
  requestOrigin: string | undefined,
  frontendOrigin: string | null,
): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (!requestOrigin) return headers

  const productionOrigin = configuredOrigin(frontendOrigin)
  const isAllowed = LOCAL_ORIGINS.has(requestOrigin) || requestOrigin === productionOrigin
  if (!isAllowed) return headers

  return {
    ...headers,
    'Access-Control-Allow-Origin': requestOrigin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
  }
}
