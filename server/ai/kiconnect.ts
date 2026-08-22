import { logDevelopmentServer } from '../observability/logger.js'

export type KiconnectEndpoint = '/api/interpret-event' | '/api/generate-menu'
export type KiconnectErrorCategory = 'kiconnect_429' | 'kiconnect_503' | 'timeout' | 'permanent_configuration' | 'permanent_request' | 'structured_output_validation' | 'other'

const MAX_ATTEMPTS = 3
const REQUEST_TIMEOUT_MS = 60_000
const FALLBACK_DELAYS_MS = [2_500, 5_500] as const

export class KiconnectApiError extends Error {
  constructor(
    readonly status: number,
    readonly category: KiconnectErrorCategory,
    readonly transient: boolean,
    readonly retryDelayMs?: number,
  ) {
    super(`KI:connect request failed with HTTP ${status}`)
    this.name = 'KiconnectApiError'
  }
}

export class KiconnectStructuredOutputError extends Error {
  constructor(readonly attempt = 1, readonly reason = 'invalid_structured_response') {
    super(`KI:connect returned an invalid structured response (${reason})`)
    this.name = 'KiconnectStructuredOutputError'
  }
}

export interface KiconnectAttemptEvent {
  endpoint: KiconnectEndpoint
  attempt: number
  status?: number
  category?: KiconnectErrorCategory
  retryDelayMs?: number
}

export interface KiconnectStructuredRequest {
  apiKey: string
  baseUrl: string
  model: string
  systemInstruction: string
  contents: string
  responseJsonSchema: unknown
  schemaName: string
  endpoint: KiconnectEndpoint
  temperature: number
  fetchImplementation?: typeof fetch
  onAttempt?: (event: KiconnectAttemptEvent) => void
  sleep?: (milliseconds: number) => Promise<void>
}

function retryAfterMilliseconds(response: Response): number | undefined {
  const value = response.headers.get('retry-after')
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined
}

function classifyStatus(status: number, retryDelayMs?: number): KiconnectApiError {
  if (status === 429) return new KiconnectApiError(status, 'kiconnect_429', true, retryDelayMs)
  if (status === 503) return new KiconnectApiError(status, 'kiconnect_503', true, retryDelayMs)
  if (status === 408 || status === 504) return new KiconnectApiError(status, 'timeout', true, retryDelayMs)
  if (status === 401 || status === 403) return new KiconnectApiError(status, 'permanent_configuration', false)
  if (status === 400 || status === 404 || status === 422) return new KiconnectApiError(status, 'permanent_request', false)
  return new KiconnectApiError(status, 'other', status >= 500, retryDelayMs)
}

function parseMessageContent(payload: unknown, attempt: number): unknown {
  if (!payload || typeof payload !== 'object') throw new KiconnectStructuredOutputError(attempt, 'invalid_response_envelope')
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices)) throw new KiconnectStructuredOutputError(attempt, 'missing_choices')
  const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new KiconnectStructuredOutputError(attempt, 'missing_text_content')
  try { return JSON.parse(content) as unknown }
  catch { throw new KiconnectStructuredOutputError(attempt, 'invalid_json') }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export async function generateKiconnectStructuredJson(request: KiconnectStructuredRequest): Promise<unknown> {
  const fetchImplementation = request.fetchImplementation ?? fetch
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchImplementation(`${request.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${request.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages: [
            {
              role: 'system',
              content: `${request.systemInstruction}\n\nReturn exactly one JSON object matching the following JSON Schema. Include every required property, using null or [] where instructed. Do not add properties and do not use markdown fences.\n${JSON.stringify(request.responseJsonSchema)}`,
            },
            { role: 'user', content: request.contents },
          ],
          temperature: request.temperature,
          max_tokens: 6_000,
          response_format: {
            type: 'json_schema',
            json_schema: { name: request.schemaName, strict: true, schema: request.responseJsonSchema },
          },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!response.ok) throw classifyStatus(response.status, retryAfterMilliseconds(response))
      request.onAttempt?.({ endpoint: request.endpoint, attempt, status: response.status })
      return parseMessageContent(await response.json() as unknown, attempt)
    } catch (cause) {
      const error = cause instanceof KiconnectApiError
        ? cause
        : cause instanceof KiconnectStructuredOutputError
          ? cause
          : new KiconnectApiError(0, cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError') ? 'timeout' : 'other', true)
      if (error instanceof KiconnectStructuredOutputError) throw error
      const canRetry = error.transient && attempt < MAX_ATTEMPTS
      const retryDelayMs = canRetry ? Math.max(error.retryDelayMs ?? 0, FALLBACK_DELAYS_MS[attempt - 1] ?? 5_500) : undefined
      const event = { endpoint: request.endpoint, attempt, ...(error.status ? { status: error.status } : {}), category: error.category, ...(retryDelayMs !== undefined ? { retryDelayMs } : {}) }
      request.onAttempt?.(event)
      logDevelopmentServer('warn', { provider: 'kiconnect', operation: 'ai_request', errorCategory: error.category, ...event })
      if (!canRetry || retryDelayMs === undefined) throw error
      await (request.sleep ?? delay)(retryDelayMs)
    }
  }
  throw new Error('KI:connect retry loop ended unexpectedly')
}
