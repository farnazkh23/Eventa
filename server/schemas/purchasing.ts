import { z } from 'zod'
import { compatibleEventInterpretationSchema } from './eventInterpretation.js'
import { productMatchPlanSchema } from './productMatching.js'

const quantityEventSchema = compatibleEventInterpretationSchema.extend({
  guestCount: z.number().int().positive().max(1_000_000),
}).strict()

const stockOverrideSchema = z.object({
  ingredientKey: z.string().trim().min(1).max(300),
  alreadyInStock: z.boolean(),
}).strict()

export const createPurchasingPlanRequestSchema = z.object({
  event: quantityEventSchema,
  productMatches: productMatchPlanSchema,
  stockOverrides: z.array(stockOverrideSchema).max(500).optional(),
}).strict().superRefine((request, context) => {
  const matchKeys = new Set(request.productMatches.matches.map(({ ingredientKey }) => ingredientKey))
  const overrideKeys = new Set<string>()
  request.stockOverrides?.forEach((override, index) => {
    if (!matchKeys.has(override.ingredientKey)) {
      context.addIssue({ code: 'custom', path: ['stockOverrides', index, 'ingredientKey'], message: 'Stock override references an unknown ingredient.' })
    }
    if (overrideKeys.has(override.ingredientKey)) {
      context.addIssue({ code: 'custom', path: ['stockOverrides', index, 'ingredientKey'], message: 'Only one stock override is allowed per ingredient.' })
    }
    overrideKeys.add(override.ingredientKey)
  })
})

const canonicalProductSchema = productMatchPlanSchema.shape.matches.element.shape.selectedProduct.unwrap()

const packCalculationSchema = z.object({
  packSize: z.number().positive(),
  packUnit: z.string().min(1),
  unitsPerSalesUnit: z.number().positive().nullable(),
  canonicalPackAmount: z.number().positive(),
  canonicalUnit: z.enum(['g', 'ml', 'piece']),
  recommendedPacks: z.number().int().nonnegative(),
  recommendedPurchaseAmount: z.number().nonnegative(),
  surplusAmount: z.number().nonnegative(),
}).strict()

const shoppingCategories = ['meat_fish', 'vegetables_fruit', 'dairy', 'pantry_grains', 'sauces', 'bakery', 'drinks', 'plant_based', 'desserts', 'review'] as const

const shoppingListLineSchema = z.object({
  ingredientKey: z.string().min(1),
  ingredientName: z.string().min(1),
  requiredAmount: z.number().nonnegative(),
  requiredUnit: z.enum(['g', 'ml', 'piece']),
  sourceMenuItemIds: z.array(z.string().min(1)).min(1),
  matchStatus: z.enum(['matched', 'low_confidence', 'unresolved']),
  selectedProduct: canonicalProductSchema.nullable(),
  pack: packCalculationSchema.nullable(),
  packsToBuy: z.number().int().nonnegative().nullable(),
  purchaseAmount: z.number().nonnegative().nullable(),
  purchaseUnit: z.enum(['g', 'ml', 'piece']).nullable(),
  surplusAmount: z.number().nonnegative().nullable(),
  knownPriceCHF: z.number().nonnegative().nullable(),
  priceBasis: z.string().nullable(),
  lineTotalCHF: z.number().nonnegative().nullable(),
  status: z.enum(['ready', 'needs_confirmation', 'unresolved', 'unpriced']),
  category: z.enum(shoppingCategories),
  alreadyInStock: z.boolean(),
  reason: z.string().min(1),
}).strict()

export const purchasingPlanSchema = z.object({
  lines: z.array(shoppingListLineSchema),
  groups: z.array(z.object({ category: z.enum(shoppingCategories), lines: z.array(shoppingListLineSchema) }).strict()),
  budget: z.object({
    knownSubtotalCHF: z.number().nonnegative(),
    pricedLineCount: z.number().int().nonnegative(),
    unpricedLineCount: z.number().int().nonnegative(),
    unresolvedLineCount: z.number().int().nonnegative(),
    alreadyInStockLineCount: z.number().int().nonnegative(),
    costPerGuestFromKnownPricesCHF: z.number().nonnegative(),
    budgetPerGuestTargetCHF: z.number().nonnegative().nullable(),
    totalBudgetTargetCHF: z.number().nonnegative().nullable(),
    differenceFromPerGuestTargetCHF: z.number().nullable(),
    differenceFromTotalTargetCHF: z.number().nullable(),
    isComplete: z.boolean(),
  }).strict(),
  summary: z.object({
    totalLines: z.number().int().nonnegative(), ready: z.number().int().nonnegative(),
    needsConfirmation: z.number().int().nonnegative(), unresolved: z.number().int().nonnegative(),
    unpriced: z.number().int().nonnegative(), alreadyInStock: z.number().int().nonnegative(),
  }).strict(),
  assumptions: z.array(z.string().min(1)),
}).strict()
