import type { EventInterpretation } from '../../shared/eventInterpretation'
import type { EventMenu } from '../../shared/menu'
import type { ProductMatchPlan, QuantityPlan, ResultStatus } from './planResults'

export interface DietaryRequirement {
  type: string
  guestCount: number | null
}

export interface PlanningEventInterpretation extends Omit<EventInterpretation, 'dietaryRequirements'> {
  dietaryRequirements: DietaryRequirement[]
}

export type InterpretationFieldId =
  | 'eventType'
  | 'guestCount'
  | 'location'
  | 'date'
  | 'time'
  | 'mealType'
  | 'serviceStyle'
  | 'budgetPerGuest'
  | 'totalBudget'
  | 'dietaryRequirements'
  | 'additionalNotes'

export interface InterpretationField {
  id: InterpretationFieldId
  label: string
  value: string
  editable: boolean
}

export type ActivePlanningPhase = 'understanding_event' | 'creating_menu' | 'calculating_quantities' | 'matching_products' | 'calculating_budget'
export type PlanningPhase = ActivePlanningPhase | 'complete' | 'error'

export interface PlanningState {
  brief: string
  confirmedEvent: PlanningEventInterpretation
  interpretation: InterpretationField[]
  interpretationStatus: 'idle' | 'loading' | 'success' | 'error'
  interpretationError: string | null
  menu: EventMenu | null
  menuStatus: 'idle' | 'loading' | 'success' | 'error'
  menuError: string | null
  quantityPlan: QuantityPlan | null
  quantityStatus: ResultStatus
  quantityError: string | null
  servingOverrides: Record<string, number>
  productPlan: ProductMatchPlan | null
  productStatus: ResultStatus
  productError: string | null
  purchasingStatus: ResultStatus
  purchasingError: string | null
  planningPhase: PlanningPhase
  failedPlanningPhase: ActivePlanningPhase | null
  planInvalidatedByBrief: boolean
}
