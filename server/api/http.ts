import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ApiErrorResponse } from '../../shared/eventInterpretation.js'
import { AppError, toAppError } from '../errors/appError.js'

const MAX_BODY_BYTES = 262_144

export function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

export function sendApiError(
  response: ServerResponse,
  status: number,
  code: string,
  message: string,
): void {
  const payload: ApiErrorResponse = { error: { code, message } }
  sendJson(response, status, payload)
}

export function sendAppError(response: ServerResponse, error: unknown): AppError {
  const appError = toAppError(error)
  sendApiError(response, appError.status, appError.code, appError.exposeMessage)
  return appError
}

export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new AppError('VALIDATION_ERROR')
    chunks.push(buffer)
  }

  if (chunks.length === 0) throw new AppError('VALIDATION_ERROR')

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new AppError('VALIDATION_ERROR')
  }
}
