export type AppErrorCode =
  | 'AI_RATE_LIMITED'
  | 'AI_TEMPORARILY_UNAVAILABLE'
  | 'AI_INVALID_OUTPUT'
  | 'VALIDATION_ERROR'
  | 'MISSING_CONFIGURATION'
  | 'QUANTITY_CONFIRMATION_REQUIRED'
  | 'INTERNAL_ERROR'
  | 'NOT_FOUND'

const defaults: Record<AppErrorCode, { status: number; message: string }> = {
  AI_RATE_LIMITED: { status: 503, message: 'Eventa is receiving many requests. Please try again shortly.' },
  AI_TEMPORARILY_UNAVAILABLE: { status: 503, message: 'Eventa\u2019s AI service is temporarily unavailable. Please try again.' },
  AI_INVALID_OUTPUT: { status: 503, message: 'Eventa could not create a valid plan. Please try again.' },
  VALIDATION_ERROR: { status: 400, message: 'Please check the submitted details and try again.' },
  MISSING_CONFIGURATION: { status: 503, message: 'Eventa\u2019s AI service is unavailable.' },
  QUANTITY_CONFIRMATION_REQUIRED: { status: 409, message: 'Please confirm the missing quantities.' },
  INTERNAL_ERROR: { status: 500, message: 'Eventa could not complete the request. Please try again.' },
  NOT_FOUND: { status: 404, message: 'API endpoint not found.' },
}

export class AppError extends Error {
  readonly status: number
  readonly exposeMessage: string

  constructor(readonly code: AppErrorCode, options: { cause?: unknown; message?: string } = {}) {
    super(code, { cause: options.cause })
    this.name = 'AppError'
    this.status = defaults[code].status
    this.exposeMessage = options.message ?? defaults[code].message
  }
}

export function toAppError(error: unknown): AppError {
  return error instanceof AppError ? error : new AppError('INTERNAL_ERROR', { cause: error })
}
