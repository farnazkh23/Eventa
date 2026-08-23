import { describe, expect, it } from 'vitest'
import type { ProductMatchPlan, QuantityPlan, ResultStatus } from '../../domain/planResults'
import { getFinalSummaryStatus } from './finalSummaryStatus'

const completeQuantities: QuantityPlan = {
  guestCount: 120,
  isComplete: true,
  itemAllocations: [{ menuItemId: 'main', menuItemName: 'Main', course: 'main', plannedServings: 120, status: 'calculated' }],
  ingredientRequirements: [],
  unresolved: [],
  unresolvedIngredients: [],
  assumptions: [],
}

const matchedProducts: ProductMatchPlan = {
  matches: [],
  summary: { totalIngredients: 2, matched: 2, lowConfidence: 0, unresolved: 0, selectedProductsWithPrice: 2 },
}

function state(overrides: Partial<{
  quantityStatus: ResultStatus
  quantityPlan: QuantityPlan | null
  productStatus: ResultStatus
  productPlan: ProductMatchPlan | null
  purchasingStatus: ResultStatus
}> = {}) {
  return {
    quantityStatus: 'idle' as ResultStatus,
    quantityPlan: null,
    productStatus: 'idle' as ResultStatus,
    productPlan: null,
    purchasingStatus: 'idle' as ResultStatus,
    ...overrides,
  }
}

describe('getFinalSummaryStatus', () => {
  it('reports not-started, loading, and failed states', () => {
    expect(getFinalSummaryStatus(state())).toMatchObject({ quantities: 'Not started', products: 'Not started', budget: 'Not started' })
    expect(getFinalSummaryStatus(state({ quantityStatus: 'loading', productStatus: 'loading', purchasingStatus: 'loading' }))).toMatchObject({ quantities: 'Calculating…', products: 'Matching…', budget: 'Calculating…' })
    expect(getFinalSummaryStatus(state({ quantityStatus: 'error', productStatus: 'error', purchasingStatus: 'error' }))).toMatchObject({ quantities: 'Calculation failed', products: 'Matching failed', budget: 'Calculation failed' })
  })

  it('reports fully resolved planning results as complete', () => {
    expect(getFinalSummaryStatus(state({
      quantityStatus: 'success',
      quantityPlan: completeQuantities,
      productStatus: 'success',
      productPlan: matchedProducts,
      purchasingStatus: 'success',
    }))).toEqual({ quantities: 'Calculated', products: 'Matched', budget: 'Calculated', orderingComplete: true })
  })

  it('does not claim completion while quantities or products need review', () => {
    const incompleteQuantities = { ...completeQuantities, isComplete: false, unresolved: [{ menuItemId: 'main', reason: 'Confirm servings' }] }
    const unresolvedProducts = { ...matchedProducts, summary: { ...matchedProducts.summary, matched: 1, unresolved: 1 } }

    expect(getFinalSummaryStatus(state({
      quantityStatus: 'success',
      quantityPlan: incompleteQuantities,
      productStatus: 'success',
      productPlan: unresolvedProducts,
      purchasingStatus: 'success',
    }))).toEqual({
      quantities: 'Confirmation needed',
      products: 'Review needed',
      budget: 'Calculated · review needed',
      orderingComplete: false,
    })
  })
})
