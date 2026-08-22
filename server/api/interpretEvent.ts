import type { IncomingMessage, ServerResponse } from 'node:http'
import type { EventInterpreter } from '../ai/eventInterpreter.js'
import { interpretEventRequestSchema } from '../schemas/eventInterpretation.js'
import { readJsonBody, sendApiError, sendJson } from './http.js'

export async function handleInterpretEvent(
  request: IncomingMessage,
  response: ServerResponse,
  interpreter: EventInterpreter | null,
): Promise<void> {
  if (!interpreter) {
    sendApiError(response, 503, 'AI_NOT_CONFIGURED', 'Eventa’s AI service is unavailable. Please try again.')
    return
  }

  let body: unknown

  try {
    body = await readJsonBody(request)
  } catch {
    sendApiError(response, 400, 'INVALID_REQUEST', 'Please provide a valid event description.')
    return
  }

  const validation = interpretEventRequestSchema.safeParse(body)

  if (!validation.success) {
    sendApiError(response, 400, 'INVALID_REQUEST', 'Please provide a valid event description.')
    return
  }

  try {
    const result = await interpreter.interpret(validation.data.description)
    sendJson(response, 200, result)
  } catch {
    sendApiError(response, 503, 'AI_UNAVAILABLE', 'Eventa’s AI service is unavailable. Please try again.')
  }
}
