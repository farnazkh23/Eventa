import type { EventMenu, MenuCourse, MenuItem } from '../../shared/menu'

export type ResultStatus = 'idle' | 'loading' | 'success' | 'error'
export type QuantityUnit = 'g' | 'ml' | 'piece'
export type ItemAllocationStatus = 'calculated' | 'needs_confirmation' | 'missing_quantity_data'
export type ProductMatchStatus = 'matched' | 'low_confidence' | 'unresolved'

export interface ItemAllocation {
  menuItemId: string
  menuItemName: string
  course: MenuCourse
  plannedServings: number | null
  status: ItemAllocationStatus
  reason?: string
}

export interface IngredientRequirement {
  ingredientKey: string
  name: string
  amount: number
  unit: QuantityUnit
  sourceMenuItemIds: string[]
}

export interface QuantityPlan {
  guestCount: number
  isComplete: boolean
  itemAllocations: ItemAllocation[]
  ingredientRequirements: IngredientRequirement[]
  unresolved: Array<{ menuItemId: string; reason: string }>
  unresolvedIngredients: Array<{ menuItemId: string; ingredientName: string; status: 'needs_confirmation'; reason: string }>
  assumptions: string[]
}

export interface CanonicalProduct {
  articleNumber: string
  name: string
  brand: string | null
  category: string
  subcategory: string | null
  packSizeValue: number | null
  packSizeUnit: string | null
  salesUnit: string | null
  unitsPerSalesUnit: number | null
  priceCHF: number | null
  priceBasis: string | null
  sourceUrl: string | null
  verificationStatus: string
  hasUnresolvedConflict: boolean
}

export interface ProductCandidate { product: CanonicalProduct; score: number; reason: string }

export interface IngredientProductMatch {
  ingredientKey: string
  ingredientName: string
  normalizedIngredientName: string
  requiredAmount: number
  requiredUnit: QuantityUnit
  sourceMenuItemIds: string[]
  status: ProductMatchStatus
  selectedProduct: CanonicalProduct | null
  score: number
  reason: string
  alternatives: ProductCandidate[]
}

export interface ProductMatchPlan {
  matches: IngredientProductMatch[]
  summary: { totalIngredients: number; matched: number; lowConfidence: number; unresolved: number; selectedProductsWithPrice: number }
}

// Budget remains behind its own backend integration; keep that boundary explicit.
export function getPlanResults() {
  return {
    quantities: { status: 'pending' as const, data: null },
    products: { status: 'pending' as const, data: null },
    budget: { status: 'pending' as const, data: null },
  }
}

export function findMenuItem(menu: EventMenu, itemId: string | undefined): MenuItem | null {
  if (!itemId) return null
  return menu.items.find((item) => item.id === itemId) ?? null
}

export function formatQuantity(amount: number, unit: QuantityUnit) {
  return `${new Intl.NumberFormat('en-CH', { maximumFractionDigits: 2 }).format(amount)} ${unit}`
}

export function allocationLabel(allocation: ItemAllocation | undefined) {
  if (!allocation) return 'Unresolved'
  if (allocation.plannedServings !== null) {
    return allocation.status === 'calculated'
      ? `${allocation.plannedServings} servings`
      : `${allocation.plannedServings} servings · ingredient data incomplete`
  }
  if (allocation.status === 'needs_confirmation') return 'Needs confirmation'
  return 'Quantity data unresolved'
}

export function productStatusLabel(status: ProductMatchStatus) {
  if (status === 'matched') return 'Matched'
  if (status === 'low_confidence') return 'Needs confirmation'
  return 'Unresolved'
}
