import type { IncomingMessage, ServerResponse } from 'node:http'
import { calculateQuantitiesRequestSchema, quantityPlanSchema } from '../schemas/quantities.js'
import { calculateQuantityPlan } from '../quantities/quantityEngine.js'
import { readJsonBody, sendApiError, sendJson } from './http.js'

export async function handleCalculateQuantities(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  let body: unknown

  try {
    body = await readJsonBody(request)
  } catch {
    sendApiError(response, 400, 'INVALID_REQUEST', 'Please provide a valid confirmed event and menu.')
    return
  }

  const validation = calculateQuantitiesRequestSchema.safeParse(body)
  if (!validation.success) {
    sendApiError(response, 400, 'INVALID_REQUEST', 'Please provide a valid confirmed event and menu.')
    return
  }

  try {
    const plan = calculateQuantityPlan(validation.data)
    sendJson(response, 200, quantityPlanSchema.parse(plan))
  } catch {
    sendApiError(response, 500, 'QUANTITY_CALCULATION_FAILED', 'Eventa could not calculate quantities. Please try again.')
  }
}
