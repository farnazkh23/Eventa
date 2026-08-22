import type { IncomingMessage, ServerResponse } from 'node:http'
import { AppError } from '../errors/appError.js'
import { calculateQuantityPlan } from '../quantities/quantityEngine.js'
import { calculateQuantitiesRequestSchema, quantityPlanSchema } from '../schemas/quantities.js'
import { readJsonBody, sendAppError, sendJson } from './http.js'

export async function handleCalculateQuantities(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let body: unknown
  try { body = await readJsonBody(request) } catch { sendAppError(response, new AppError('VALIDATION_ERROR', { message: 'Please provide a valid confirmed event and menu.' })); return }
  const validation = calculateQuantitiesRequestSchema.safeParse(body)
  if (!validation.success) { sendAppError(response, new AppError('VALIDATION_ERROR', { message: 'Please provide a valid confirmed event and menu.' })); return }
  try { sendJson(response, 200, quantityPlanSchema.parse(calculateQuantityPlan(validation.data))) }
  catch (cause) { throw new AppError('INTERNAL_ERROR', { cause }) }
}
