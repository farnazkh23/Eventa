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

const packSchema = z.object({ packSize: z.number().positive(), packUnit: z.string().min(1), unitsPerSalesUnit: z.number().positive().nullable(), canonicalPackAmount: z.number().positive(), canonicalUnit: unitSchema, recommendedPacks: z.number().int().nonnegative(), recommendedPurchaseAmount: z.number().nonnegative(), surplusAmount: z.number().nonnegative() }).strict()
const shoppingCategories = ['meat_fish', 'vegetables_fruit', 'dairy', 'pantry_grains', 'sauces', 'bakery', 'drinks', 'plant_based', 'desserts', 'review'] as const
const shoppingLineSchema = z.object({ ingredientKey: z.string().min(1), ingredientName: z.string().min(1), requiredAmount: z.number().nonnegative(), requiredUnit: unitSchema, sourceMenuItemIds: z.array(z.string().min(1)).min(1), matchStatus: z.enum(['matched', 'low_confidence', 'unresolved']), selectedProduct: productSchema.nullable(), pack: packSchema.nullable(), packsToBuy: z.number().int().nonnegative().nullable(), purchaseAmount: z.number().nonnegative().nullable(), purchaseUnit: unitSchema.nullable(), surplusAmount: z.number().nonnegative().nullable(), knownPriceCHF: z.number().nonnegative().nullable(), priceBasis: z.string().nullable(), lineTotalCHF: z.number().nonnegative().nullable(), status: z.enum(['ready', 'needs_confirmation', 'unresolved', 'unpriced']), category: z.enum(shoppingCategories), alreadyInStock: z.boolean(), reason: z.string().min(1) }).strict()
const purchasingPlanSchema = z.object({
  lines: z.array(shoppingLineSchema),
  groups: z.array(z.object({ category: z.enum(shoppingCategories), lines: z.array(shoppingLineSchema) }).strict()),
  budget: z.object({ knownSubtotalCHF: z.number().nonnegative(), pricedLineCount: z.number().int().nonnegative(), unpricedLineCount: z.number().int().nonnegative(), unresolvedLineCount: z.number().int().nonnegative(), alreadyInStockLineCount: z.number().int().nonnegative(), costPerGuestFromKnownPricesCHF: z.number().nonnegative(), budgetPerGuestTargetCHF: z.number().nonnegative().nullable(), totalBudgetTargetCHF: z.number().nonnegative().nullable(), differenceFromPerGuestTargetCHF: z.number().nullable(), differenceFromTotalTargetCHF: z.number().nullable(), isComplete: z.boolean() }).strict(),
  summary: z.object({ totalLines: z.number().int().nonnegative(), ready: z.number().int().nonnegative(), needsConfirmation: z.number().int().nonnegative(), unresolved: z.number().int().nonnegative(), unpriced: z.number().int().nonnegative(), alreadyInStock: z.number().int().nonnegative() }).strict(),
  assumptions: z.array(z.string().min(1)),
}).strict()

export class PlanResultsServiceError extends Error {}

async function postAndParse<T>(path: string, body: unknown, schema: z.ZodType<T>, invalidMessage: string, unavailableMessage = 'This planning step is not available from the current backend.'): Promise<T> {
  let response: Response
  try { response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }
  catch { throw new PlanResultsServiceError('Eventa could not reach the planning service. Please try again.') }
  if (!response.ok) throw new PlanResultsServiceError(response.status === 400 ? 'The planning service needs updated event data. Please review the plan and retry.' : response.status === 404 ? unavailableMessage : 'Eventa could not complete this planning step. Please try again.')
  try { return schema.parse(await response.json()) }
  catch { throw new PlanResultsServiceError(invalidMessage) }
}

export interface ServingOverride { menuItemId: string; servings: number }

export function calculateQuantities(event: PlanningEventInterpretation, menu: EventMenu, servingOverrides: ServingOverride[] = []) {
  const body = { event, menu, ...(servingOverrides.length ? { servingOverrides } : {}) }
  return postAndParse('/api/calculate-quantities', body, quantityPlanSchema, 'Eventa received invalid quantity results. Please try again.') as Promise<QuantityPlan>
}

export function matchProducts(ingredients: QuantityPlan['ingredientRequirements']) {
  return postAndParse('/api/match-products', { ingredients }, productPlanSchema, 'Eventa received invalid product matches. Please try again.') as Promise<ProductMatchPlan>
}

export async function createPurchasingPlan(event: PlanningEventInterpretation, productMatches: ProductMatchPlan) {
  await postAndParse('/api/create-purchasing-plan', { event, productMatches }, purchasingPlanSchema, 'Eventa received invalid purchasing results. Please try again.', 'Budget calculation is not available from the current backend yet.')
}
