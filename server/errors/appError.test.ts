import { describe, expect, it } from 'vitest'
import { AppError, toAppError } from './appError.js'

describe('AppError', () => {
  it('maps known errors to safe responses', () => {
    const error = new AppError('AI_RATE_LIMITED', { cause: new Error('secret provider detail') })
    expect({ code: error.code, status: error.status, message: error.exposeMessage }).toEqual({
      code: 'AI_RATE_LIMITED', status: 503, message: 'Eventa is receiving many requests. Please try again shortly.',
    })
  })
  it('hides unknown failures behind INTERNAL_ERROR', () => {
    expect(toAppError(new Error('database password')).code).toBe('INTERNAL_ERROR')
  })
})
