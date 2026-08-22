import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MenuGenerator } from '../ai/menuGenerator.js'
import { toAIAppError } from '../ai/providerErrors.js'
import { AppError } from '../errors/appError.js'
import { generateMenuRequestSchema } from '../schemas/menu.js'
import { readJsonBody, sendAppError, sendJson } from './http.js'

export async function handleGenerateMenu(request: IncomingMessage, response: ServerResponse, generator: MenuGenerator | null): Promise<void> {
  if (!generator) { sendAppError(response, new AppError('MISSING_CONFIGURATION', { message: 'Eventa\u2019s menu service is unavailable.' })); return }
  let body: unknown
  try { body = await readJsonBody(request) } catch { sendAppError(response, new AppError('VALIDATION_ERROR', { message: 'Please confirm valid event details.' })); return }
  const validation = generateMenuRequestSchema.safeParse(body)
  if (!validation.success) { sendAppError(response, new AppError('VALIDATION_ERROR', { message: 'Please confirm valid event details.' })); return }
  try { sendJson(response, 200, await generator.generate(validation.data)) }
  catch (cause) { throw toAIAppError(cause) }
}
