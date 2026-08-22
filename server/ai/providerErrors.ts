import { AppError } from '../errors/appError.js'
import { describeGeminiError, StructuredOutputValidationError } from './gemini.js'
import { KiconnectApiError, KiconnectStructuredOutputError } from './kiconnect.js'

export function toAIAppError(cause: unknown): AppError {
  if (cause instanceof StructuredOutputValidationError || cause instanceof KiconnectStructuredOutputError || cause instanceof Error && cause.name === 'ZodError') {
    return new AppError('AI_INVALID_OUTPUT', { cause })
  }
  if (cause instanceof KiconnectApiError) {
    if (cause.category === 'kiconnect_429') return new AppError('AI_RATE_LIMITED', { cause })
    if (cause.category === 'permanent_configuration') return new AppError('MISSING_CONFIGURATION', { cause })
    return new AppError('AI_TEMPORARILY_UNAVAILABLE', { cause })
  }
  const details = describeGeminiError(cause)
  return new AppError(details.category === 'gemini_429' ? 'AI_RATE_LIMITED' : 'AI_TEMPORARILY_UNAVAILABLE', { cause })
}
