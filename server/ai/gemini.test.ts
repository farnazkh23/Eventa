import { ApiError } from '@google/genai'
import { describe, expect, it, vi } from 'vitest'
import {
  describeGeminiError,
  parseStructuredResponse,
  StructuredOutputValidationError,
  withGeminiRetry,
} from './gemini.js'

function apiError(status: number, body: unknown = { error: { status } }): ApiError {
  return new ApiError({ status, message: JSON.stringify(body) })
}

describe('withGeminiRetry', () => {
  it('retries 429 and respects Gemini retry-delay metadata', async () => {
    const sleep = vi.fn(async () => undefined)
    const operation = vi.fn()
      .mockRejectedValueOnce(apiError(429, {
        error: {
          details: [{
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '7s',
          }],
        },
      }))
      .mockResolvedValue('menu')

    await expect(withGeminiRetry(
      operation,
      '/api/generate-menu',
      1,
      { sleep, random: () => 0 },
    )).resolves.toBe('menu')
    expect(operation).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(7_000)
  })

  it('uses bounded fallback backoff for repeated 503 responses', async () => {
    const sleep = vi.fn(async () => undefined)
    const operation = vi.fn()
      .mockRejectedValueOnce(apiError(503))
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValue('menu')

    await expect(withGeminiRetry(
      operation,
      '/api/generate-menu',
      1,
      { sleep, random: () => 0 },
    )).resolves.toBe('menu')
    expect(sleep.mock.calls).toEqual([[2_500], [5_500]])
  })

  it('retries timeouts but stops after three total attempts', async () => {
    const timeout = new Error('Request timed out')
    timeout.name = 'TimeoutError'
    const sleep = vi.fn(async () => undefined)
    const operation = vi.fn().mockRejectedValue(timeout)

    await expect(withGeminiRetry(
      operation,
      '/api/generate-menu',
      1,
      { sleep, random: () => 0 },
    )).rejects.toBe(timeout)
    expect(operation).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
  })

  it('does not retry permanent API errors', async () => {
    const sleep = vi.fn(async () => undefined)
    const operation = vi.fn().mockRejectedValue(apiError(400))

    await expect(withGeminiRetry(
      operation,
      '/api/generate-menu',
      1,
      { sleep },
    )).rejects.toBeInstanceOf(ApiError)
    expect(operation).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })
})

describe('Gemini error classification', () => {
  it.each([
    [429, 'gemini_429', true],
    [503, 'gemini_503', true],
    [504, 'timeout', true],
    [401, 'permanent_configuration', false],
    [400, 'permanent_request', false],
  ] as const)('classifies status %s', (status, category, transient) => {
    expect(describeGeminiError(apiError(status))).toMatchObject({ category, status, transient })
  })

  it('turns invalid JSON into a structured-output validation error', () => {
    expect(() => parseStructuredResponse('not-json', 2)).toThrow(
      expect.objectContaining<Partial<StructuredOutputValidationError>>({
        name: 'StructuredOutputValidationError',
        geminiAttempt: 2,
      }),
    )
  })
})
