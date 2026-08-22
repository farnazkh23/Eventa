import type { EventInterpretation } from '../../shared/eventInterpretation'
import type { EventMenu } from '../../shared/menu'

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

export interface PlanningState {
  brief: string
  confirmedEvent: EventInterpretation
  interpretation: InterpretationField[]
  interpretationStatus: 'idle' | 'loading' | 'success' | 'error'
  interpretationError: string | null
  menu: EventMenu | null
  menuStatus: 'idle' | 'loading' | 'success' | 'error'
  menuError: string | null
}
