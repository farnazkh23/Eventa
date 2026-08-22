import { z } from 'zod'
import { menuCourses, type EventMenu } from '../../shared/menu'
import type { ProductMatchPlan, QuantityPlan } from '../domain/planResults'
import type { PlanningEventInterpretation } from '../domain/planning'

const unitSchema = z.enum(['g', 'ml', 'piece'])
const productSchema = z.object({
  articleNumber: z.string().regex(/^\d{6}$/), name: z.string().min(1), brand: z.string().nullable(),
  category: z.string().min(1), subcategory: z.string().nullable(), packSizeValue: z.number().positive().nullable(),
  packSizeUnit: z.string().nullable(), salesUnit: z.string().nullable(), unitsPerSalesUnit: z.number().positive().nullable(),
  priceCHF: z.number().nonnegative().nullable(), priceBasis: z.string().nullable(), sourceUrl: z.string().url().nullable(),
  verificationStatus: z.string().min(1), hasUnresolvedConflict: z.boolean(),
}).strict()
const candidateSchema = z.object({ product: productSchema, score: z.number().min(0).max(100), reason: z.string().min(1) }).strict()

const quantityPlanSchema = z.object({
  guestCount: z.number().int().positive(), isComplete: z.boolean(),
  itemAllocations: z.array(z.object({ menuItemId: z.string().min(1), menuItemName: z.string().min(1), course: z.enum(menuCourses), plannedServings: z.number().int().nonnegative().nullable(), status: z.enum(['calculated', 'needs_confirmation', 'missing_quantity_data']), reason: z.string().min(1).optional() }).strict()),
  ingredientRequirements: z.array(z.object({ ingredientKey: z.string().min(1), name: z.string().min(1), amount: z.number().nonnegative(), unit: unitSchema, sourceMenuItemIds: z.array(z.string().min(1)).min(1) }).strict()),
  unresolved: z.array(z.object({ menuItemId: z.string().min(1), reason: z.string().min(1) }).strict()),
  unresolvedIngredients: z.array(z.object({ menuItemId: z.string().min(1), ingredientName: z.string().min(1), status: z.literal('needs_confirmation'), reason: z.string().min(1) }).strict()).optional().default([]),
  assumptions: z.array(z.string().min(1)),
}).strict()

const productPlanSchema = z.object({
  matches: z.array(z.object({ ingredientKey: z.string().min(1), ingredientName: z.string().min(1), normalizedIngredientName: z.string().min(1), requiredAmount: z.number().nonnegative(), requiredUnit: unitSchema, sourceMenuItemIds: z.array(z.string().min(1)).min(1), status: z.enum(['matched', 'low_confidence', 'unresolved']), selectedProduct: productSchema.nullable(), score: z.number().min(0).max(100), reason: z.string().min(1), alternatives: z.array(candidateSchema).max(3) }).strict()),
  summary: z.object({ totalIngredients: z.number().int().nonnegative(), matched: z.number().int().nonnegative(), lowConfidence: z.number().int().nonnegative(), unresolved: z.number().int().nonnegative(), selectedProductsWithPrice: z.number().int().nonnegative() }).strict(),
}).strict()

export class PlanResultsServiceError extends Error {}

async function postAndParse<T>(path: string, body: unknown, schema: z.ZodType<T>, invalidMessage: string): Promise<T> {
  let response: Response
  try { response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }
  catch { throw new PlanResultsServiceError('Eventa could not reach the planning service. Please try again.') }
  if (!response.ok) throw new PlanResultsServiceError(response.status === 400 ? 'The planning service needs updated event data. Please review the plan and retry.' : 'Eventa could not complete this planning step. Please try again.')
  try { return schema.parse(await response.json()) }
  catch { throw new PlanResultsServiceError(invalidMessage) }
}

export function calculateQuantities(event: PlanningEventInterpretation, menu: EventMenu) {
  return postAndParse('/api/calculate-quantities', { event, menu }, quantityPlanSchema, 'Eventa received invalid quantity results. Please try again.') as Promise<QuantityPlan>
}

export function matchProducts(ingredients: QuantityPlan['ingredientRequirements']) {
  return postAndParse('/api/match-products', { ingredients }, productPlanSchema, 'Eventa received invalid product matches. Please try again.') as Promise<ProductMatchPlan>
}
