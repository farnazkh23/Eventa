import type { IncomingMessage, ServerResponse } from 'node:http'
import { AppError } from '../errors/appError.js'
import { loadCanonicalCatalogue } from '../products/canonicalCatalogue.js'
import { matchProducts } from '../products/productMatcher.js'
import { matchProductsRequestSchema, productMatchPlanSchema } from '../schemas/productMatching.js'
import { readJsonBody, sendAppError, sendJson } from './http.js'

let cataloguePromise: ReturnType<typeof loadCanonicalCatalogue> | undefined

export async function handleMatchProducts(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let body: unknown
  try { body = await readJsonBody(request) }
  catch { sendAppError(response, new AppError('VALIDATION_ERROR', { message: 'Please provide valid ingredients to match.' })); return }
  const validation = matchProductsRequestSchema.safeParse(body)
  if (!validation.success) { sendAppError(response, new AppError('VALIDATION_ERROR', { message: 'Please provide valid ingredients to match.' })); return }
  try {
    cataloguePromise ??= loadCanonicalCatalogue()
    const plan = matchProducts(validation.data.ingredients, await cataloguePromise)
    sendJson(response, 200, productMatchPlanSchema.parse(plan))
  } catch (cause) {
    cataloguePromise = undefined
    throw new AppError('INTERNAL_ERROR', { cause })
  }
}
