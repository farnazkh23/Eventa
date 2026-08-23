import type { PlanningState } from '../../domain/planning'

type ResultState = Pick<
  PlanningState,
  'quantityStatus' | 'quantityPlan' | 'productStatus' | 'productPlan' | 'purchasingStatus'
>

export interface FinalSummaryStatus {
  quantities: string
  products: string
  budget: string
  orderingComplete: boolean
}

export function getFinalSummaryStatus(state: ResultState): FinalSummaryStatus {
  const quantitiesResolved = state.quantityStatus === 'success'
    && state.quantityPlan?.isComplete === true
    && state.quantityPlan.itemAllocations.every((item) => item.status === 'calculated')
    && state.quantityPlan.unresolved.length === 0
    && state.quantityPlan.unresolvedIngredients.length === 0

  const productSummary = state.productPlan?.summary
  const productsResolved = state.productStatus === 'success'
    && productSummary !== undefined
    && productSummary.totalIngredients > 0
    && productSummary.matched === productSummary.totalIngredients
    && productSummary.lowConfidence === 0
    && productSummary.unresolved === 0

  const quantities = state.quantityStatus === 'loading'
    ? 'Calculating…'
    : state.quantityStatus === 'error'
      ? 'Calculation failed'
      : state.quantityStatus === 'success'
        ? quantitiesResolved ? 'Calculated' : 'Confirmation needed'
        : 'Not started'

  const products = state.productStatus === 'loading'
    ? 'Matching…'
    : state.productStatus === 'error'
      ? 'Matching failed'
      : state.productStatus === 'success'
        ? productsResolved ? 'Matched' : 'Review needed'
        : 'Not started'

  const upstreamNeedsReview = !quantitiesResolved || !productsResolved
  const budget = state.purchasingStatus === 'loading'
    ? 'Calculating…'
    : state.purchasingStatus === 'error'
      ? 'Calculation failed'
      : state.purchasingStatus === 'success'
        ? upstreamNeedsReview ? 'Calculated · review needed' : 'Calculated'
        : 'Not started'

  return {
    quantities,
    products,
    budget,
    orderingComplete: quantitiesResolved && productsResolved && state.purchasingStatus === 'success',
  }
}
