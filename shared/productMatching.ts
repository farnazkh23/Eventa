export type ProductMatchStatus = 'matched' | 'low_confidence' | 'unresolved'

export interface ProductMatchIngredient {
  ingredientKey: string
  name: string
  amount: number
  unit: 'g' | 'ml' | 'piece'
  sourceMenuItemIds: string[]
  categoryHint?: string
  subcategoryHint?: string
}

export interface MatchProductsRequest {
  ingredients: ProductMatchIngredient[]
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

export interface ProductCandidate {
  product: CanonicalProduct
  score: number
  reason: string
}

export interface IngredientProductMatch {
  ingredientKey: string
  ingredientName: string
  normalizedIngredientName: string
  requiredAmount: number
  requiredUnit: 'g' | 'ml' | 'piece'
  sourceMenuItemIds: string[]
  status: ProductMatchStatus
  selectedProduct: CanonicalProduct | null
  score: number
  reason: string
  alternatives: ProductCandidate[]
}

export interface ProductMatchPlan {
  matches: IngredientProductMatch[]
  summary: {
    totalIngredients: number
    matched: number
    lowConfidence: number
    unresolved: number
    selectedProductsWithPrice: number
  }
}
