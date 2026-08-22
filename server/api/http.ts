import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ApiErrorResponse } from '../../shared/eventInterpretation.js'

const MAX_BODY_BYTES = 16_384

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

export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE')
    chunks.push(buffer)
  }

  if (chunks.length === 0) throw new Error('INVALID_JSON')

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new Error('INVALID_JSON')
  }
}
