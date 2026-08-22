import type { IncomingMessage, ServerResponse } from 'node:http'
import { AppError } from '../errors/appError.js'
import { createPurchasingPlan } from '../purchasing/purchasingEngine.js'
import { createPurchasingPlanRequestSchema, purchasingPlanSchema } from '../schemas/purchasing.js'
import { readJsonBody, sendAppError, sendJson } from './http.js'

export async function handleCreatePurchasingPlan(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let body: unknown
  try { body = await readJsonBody(request) }
  catch { sendAppError(response, new AppError('VALIDATION_ERROR', { message: 'Please provide a valid event and product matches.' })); return }
  const validation = createPurchasingPlanRequestSchema.safeParse(body)
  if (!validation.success) { sendAppError(response, new AppError('VALIDATION_ERROR', { message: 'Please provide a valid event and product matches.' })); return }
  try { sendJson(response, 200, purchasingPlanSchema.parse(createPurchasingPlan(validation.data))) }
  catch (cause) { throw new AppError('INTERNAL_ERROR', { cause }) }
}
