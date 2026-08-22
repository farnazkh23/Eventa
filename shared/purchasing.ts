import type { QuantityEvent } from './quantities.js'
import type { CanonicalProduct, ProductMatchPlan, ProductMatchStatus } from './productMatching.js'

export type ShoppingCategory =
  | 'meat_fish'
  | 'vegetables_fruit'
  | 'dairy'
  | 'pantry_grains'
  | 'sauces'
  | 'bakery'
  | 'drinks'
  | 'plant_based'
  | 'desserts'
  | 'review'

export type ShoppingLineStatus = 'ready' | 'needs_confirmation' | 'unresolved' | 'unpriced'

export interface StockOverride {
  ingredientKey: string
  alreadyInStock: boolean
}

export interface CreatePurchasingPlanRequest {
  event: QuantityEvent
  productMatches: ProductMatchPlan
  stockOverrides?: StockOverride[]
}

export interface PackCalculation {
  packSize: number
  packUnit: string
  unitsPerSalesUnit: number | null
  canonicalPackAmount: number
  canonicalUnit: 'g' | 'ml' | 'piece'
  recommendedPacks: number
  recommendedPurchaseAmount: number
  surplusAmount: number
}

export interface ShoppingListLine {
  ingredientKey: string
  ingredientName: string
  requiredAmount: number
  requiredUnit: 'g' | 'ml' | 'piece'
  sourceMenuItemIds: string[]
  matchStatus: ProductMatchStatus
  selectedProduct: CanonicalProduct | null
  pack: PackCalculation | null
  packsToBuy: number | null
  purchaseAmount: number | null
  purchaseUnit: 'g' | 'ml' | 'piece' | null
  surplusAmount: number | null
  knownPriceCHF: number | null
  priceBasis: string | null
  lineTotalCHF: number | null
  status: ShoppingLineStatus
  category: ShoppingCategory
  alreadyInStock: boolean
  reason: string
}

export interface PurchasingBudget {
  knownSubtotalCHF: number
  pricedLineCount: number
  unpricedLineCount: number
  unresolvedLineCount: number
  alreadyInStockLineCount: number
  costPerGuestFromKnownPricesCHF: number
  budgetPerGuestTargetCHF: number | null
  totalBudgetTargetCHF: number | null
  differenceFromPerGuestTargetCHF: number | null
  differenceFromTotalTargetCHF: number | null
  isComplete: boolean
}

export interface PurchasingPlan {
  lines: ShoppingListLine[]
  groups: Array<{ category: ShoppingCategory; lines: ShoppingListLine[] }>
  budget: PurchasingBudget
  summary: {
    totalLines: number
    ready: number
    needsConfirmation: number
    unresolved: number
    unpriced: number
    alreadyInStock: number
  }
  assumptions: string[]
}
