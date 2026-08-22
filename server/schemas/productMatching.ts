import { z } from 'zod'

export const matchProductsRequestSchema = z.object({
  ingredients: z.array(z.object({
    ingredientKey: z.string().trim().min(1).max(300),
    name: z.string().trim().min(1).max(300),
    amount: z.number().finite().nonnegative(),
    unit: z.enum(['g', 'ml', 'piece']),
    sourceMenuItemIds: z.array(z.string().trim().min(1).max(200)).min(1).max(100),
    categoryHint: z.string().trim().min(1).max(100).optional(),
    subcategoryHint: z.string().trim().min(1).max(100).optional(),
  }).strict()).min(1).max(500),
}).strict()

const canonicalProductSchema = z.object({
  articleNumber: z.string().regex(/^\d{6}$/),
  name: z.string().min(1),
  brand: z.string().nullable(),
  category: z.string().min(1),
  subcategory: z.string().nullable(),
  packSizeValue: z.number().positive().nullable(),
  packSizeUnit: z.string().nullable(),
  salesUnit: z.string().nullable(),
  unitsPerSalesUnit: z.number().positive().nullable(),
  priceCHF: z.number().nonnegative().nullable(),
  priceBasis: z.string().nullable(),
  sourceUrl: z.string().url().nullable(),
  verificationStatus: z.string().min(1),
  hasUnresolvedConflict: z.boolean(),
}).strict()

const productCandidateSchema = z.object({
  product: canonicalProductSchema,
  score: z.number().min(0).max(100),
  reason: z.string().min(1),
}).strict()

const ingredientProductMatchSchema = z.object({
  ingredientKey: z.string().min(1),
  ingredientName: z.string().min(1),
  normalizedIngredientName: z.string().min(1),
  requiredAmount: z.number().finite().nonnegative(),
  requiredUnit: z.enum(['g', 'ml', 'piece']),
  sourceMenuItemIds: z.array(z.string().min(1)).min(1),
  status: z.enum(['matched', 'low_confidence', 'unresolved']),
  selectedProduct: canonicalProductSchema.nullable(),
  score: z.number().min(0).max(100),
  reason: z.string().min(1),
  alternatives: z.array(productCandidateSchema).max(3),
}).strict()

export const productMatchPlanSchema = z.object({
  matches: z.array(ingredientProductMatchSchema),
  summary: z.object({
    totalIngredients: z.number().int().nonnegative(),
    matched: z.number().int().nonnegative(),
    lowConfidence: z.number().int().nonnegative(),
    unresolved: z.number().int().nonnegative(),
    selectedProductsWithPrice: z.number().int().nonnegative(),
  }).strict(),
}).strict()
