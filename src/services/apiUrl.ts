function normalizeBaseUrl(baseUrl: string | undefined): string {
  return baseUrl?.trim().replace(/\/+$/, '') ?? ''
}

export function getApiUrl(path: string, baseUrl = import.meta.env.VITE_API_BASE_URL): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  return normalizedBaseUrl ? `${normalizedBaseUrl}${normalizedPath}` : normalizedPath
}
