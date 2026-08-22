import type { IncomingMessage, ServerResponse } from 'node:http'
import type { EventInterpreter } from '../ai/eventInterpreter.js'
import { AppError } from '../errors/appError.js'
import { interpretEventRequestSchema } from '../schemas/eventInterpretation.js'
import { readJsonBody, sendAppError, sendJson } from './http.js'
import { toAIAppError } from '../ai/providerErrors.js'

export async function handleInterpretEvent(request: IncomingMessage, response: ServerResponse, interpreter: EventInterpreter | null): Promise<void> {
  if (!interpreter) { sendAppError(response, new AppError('MISSING_CONFIGURATION')); return }
  let body: unknown
  try { body = await readJsonBody(request) } catch { sendAppError(response, new AppError('VALIDATION_ERROR', { message: 'Please provide a valid event description.' })); return }
  const validation = interpretEventRequestSchema.safeParse(body)
  if (!validation.success) { sendAppError(response, new AppError('VALIDATION_ERROR', { message: 'Please provide a valid event description.' })); return }
  try { sendJson(response, 200, await interpreter.interpret(validation.data.description)) }
  catch (cause) { throw toAIAppError(cause) }
}
