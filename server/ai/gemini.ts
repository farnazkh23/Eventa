import { ApiError, GoogleGenAI } from '@google/genai'
import { logDevelopmentServer } from '../observability/logger.js'

export type AiErrorCategory = 'gemini_429' | 'gemini_503' | 'timeout' | 'structured_output_validation' | 'permanent_configuration' | 'permanent_request' | 'other'

const MAX_GEMINI_ATTEMPTS = 3
const GEMINI_REQUEST_TIMEOUT_MS = 45_000
const MAX_RETRY_DELAY_MS = 60_000
const FALLBACK_DELAYS_MS = [2_500, 5_500] as const
const FALLBACK_JITTER_MS = [500, 1_500] as const

type AiEndpoint = '/api/interpret-event' | '/api/generate-menu'

interface StructuredGenerationOptions {
  client: GoogleGenAI
  model: string
  contents: string
  systemInstruction: string
  responseJsonSchema: unknown
  temperature?: number
  endpoint: AiEndpoint
  regenerationAttempt?: number
}

interface RetryDependencies {
  sleep?: (milliseconds: number) => Promise<void>
  random?: () => number
}

export interface GeminiErrorDetails {
  category: AiErrorCategory
  status?: number
  transient: boolean
  retryDelayMs?: number
}

export class StructuredOutputValidationError extends Error {
  constructor(readonly geminiAttempt = 1) {
    super('Gemini returned an invalid structured response')
    this.name = 'StructuredOutputValidationError'
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseDurationMilliseconds(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value * 1000
  }
  if (typeof value === 'string') {
    const seconds = value.trim().match(/^(\d+(?:\.\d+)?)s$/i)
    if (seconds) return Number(seconds[1]) * 1000

    const numericSeconds = Number(value)
    if (Number.isFinite(numericSeconds) && numericSeconds >= 0) return numericSeconds * 1000

    const retryDate = Date.parse(value)
    if (Number.isFinite(retryDate)) return Math.max(0, retryDate - Date.now())
  }
  if (isRecord(value)) {
    const seconds = Number(value.seconds ?? 0)
    const nanos = Number(value.nanos ?? 0)
    if (Number.isFinite(seconds) && Number.isFinite(nanos) && seconds >= 0 && nanos >= 0) {
      return seconds * 1000 + nanos / 1_000_000
    }
  }
  return undefined
}

function findRetryDelay(value: unknown): number | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const delayMs = findRetryDelay(entry)
      if (delayMs !== undefined) return delayMs
    }
    return undefined
  }
  if (!isRecord(value)) return undefined

  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.toLocaleLowerCase('en').replace(/[-_]/g, '')
    if (normalizedKey === 'retryafter' || normalizedKey === 'retrydelay') {
      const delayMs = parseDurationMilliseconds(entry)
      if (delayMs !== undefined) return delayMs
    }
  }

  for (const entry of Object.values(value)) {
    const delayMs = findRetryDelay(entry)
    if (delayMs !== undefined) return delayMs
  }
  return undefined
}

function errorPayload(error: unknown): unknown {
  if (!isRecord(error) && !(error instanceof Error)) return undefined

  const possibleHeaders = isRecord(error) ? error.headers : undefined
  if (possibleHeaders instanceof Headers) {
    const retryAfter = possibleHeaders.get('retry-after')
    if (retryAfter) return { retryAfter }
  }
  if (isRecord(possibleHeaders)) {
    const retryAfter = possibleHeaders['retry-after'] ?? possibleHeaders['Retry-After']
    if (retryAfter !== undefined) return { retryAfter }
  }

  const message = error instanceof Error ? error.message : undefined
  if (!message) return undefined
  try {
    return JSON.parse(message) as unknown
  } catch {
    return { message }
  }
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const name = error.name.toLocaleLowerCase('en')
  const message = error.message.toLocaleLowerCase('en')
  return name.includes('timeout') || name === 'aborterror' || message.includes('timed out')
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : ''
  return ['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)
    || error.name === 'TypeError' && /fetch|network|socket/i.test(error.message)
}

export function describeGeminiError(error: unknown): GeminiErrorDetails {
  const status = error instanceof ApiError
    ? error.status
    : isRecord(error) && typeof error.status === 'number'
      ? error.status
      : undefined
  const retryDelayMs = findRetryDelay(errorPayload(error))

  if (status === 429) return { category: 'gemini_429', status, transient: true, retryDelayMs }
  if (status === 503) return { category: 'gemini_503', status, transient: true, retryDelayMs }
  if (status === 408 || status === 504) {
    return { category: 'timeout', status, transient: true, retryDelayMs }
  }
  if (isTimeoutError(error)) return { category: 'timeout', status, transient: true, retryDelayMs }
  if (isTransientNetworkError(error)) return { category: 'other', status, transient: true, retryDelayMs }
  if (status === 401 || status === 403) {
    return { category: 'permanent_configuration', status, transient: false, retryDelayMs }
  }
  if (status === 400 || status === 404) {
    return { category: 'permanent_request', status, transient: false, retryDelayMs }
  }
  return { category: 'other', status, transient: false, retryDelayMs }
}

function fallbackRetryDelay(retryIndex: number, random: () => number): number {
  const base = FALLBACK_DELAYS_MS[retryIndex] ?? FALLBACK_DELAYS_MS.at(-1) ?? 5_500
  const jitterRange = FALLBACK_JITTER_MS[retryIndex] ?? FALLBACK_JITTER_MS.at(-1) ?? 1_500
  return base + Math.round(random() * jitterRange)
}

export async function withGeminiRetry<T>(
  operation: (attempt: number) => Promise<T>,
  endpoint: AiEndpoint,
  regenerationAttempt = 1,
  dependencies: RetryDependencies = {},
): Promise<T> {
  const sleep = dependencies.sleep ?? delay
  const random = dependencies.random ?? Math.random

  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt += 1) {
    try {
      return await operation(attempt)
    } catch (error) {
      const details = describeGeminiError(error)
      const canRetry = details.transient && attempt < MAX_GEMINI_ATTEMPTS
      const retryDelayMs = canRetry
        ? Math.min(
            MAX_RETRY_DELAY_MS,
            Math.max(
              details.retryDelayMs ?? 0,
              fallbackRetryDelay(attempt - 1, random),
            ),
          )
        : undefined

      logDevelopmentServer('warn', {
        endpoint,
        operation: 'gemini_request',
        attempt,
        regenerationAttempt,
        ...(details.status !== undefined ? { status: details.status } : {}),
        errorCategory: details.category,
        ...(retryDelayMs !== undefined ? { retryDelayMs } : {}),
      })

      if (!canRetry || retryDelayMs === undefined) throw error
      await sleep(retryDelayMs)
    }
  }

  throw new Error('Gemini retry loop ended unexpectedly')
}

export function parseStructuredResponse(text: string | undefined, geminiAttempt = 1): unknown {
  if (!text) throw new StructuredOutputValidationError(geminiAttempt)
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new StructuredOutputValidationError(geminiAttempt)
  }
}

export interface StructuredJsonResult {
  value: unknown
  geminiAttempt: number
}

export async function generateStructuredJson({
  client,
  model,
  contents,
  systemInstruction,
  responseJsonSchema,
  temperature = 0.1,
  endpoint,
  regenerationAttempt = 1,
}: StructuredGenerationOptions): Promise<StructuredJsonResult> {
  const response = await withGeminiRetry(
    async (attempt) => ({
      response: await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature,
          responseMimeType: 'application/json',
          responseJsonSchema,
          httpOptions: { timeout: GEMINI_REQUEST_TIMEOUT_MS },
        },
      }),
      attempt,
    }),
    endpoint,
    regenerationAttempt,
  )

  return {
    value: parseStructuredResponse(response.response.text, response.attempt),
    geminiAttempt: response.attempt,
  }
}
