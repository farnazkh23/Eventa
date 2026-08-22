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

export interface EventPlanSummary {
  title: string
  guestCount: number
  location: string
  date: string
  menu: string[]
  foodKg: number
  beveragesLitres: number
  productCount: number
  totalCost: number
  budgetPerGuest: number
}

export interface PlanningState {
  brief: string
  interpretation: InterpretationField[]
  interpretationStatus: 'idle' | 'loading' | 'success' | 'error'
  interpretationError: string | null
  plan: EventPlanSummary
}
