import type { EventInterpretation } from './eventInterpretation.js'
import type { EventMenu, MenuCourse } from './menu.js'

export type CanonicalQuantityUnit = 'g' | 'ml' | 'piece'
export type ItemAllocationStatus =
  | 'calculated'
  | 'needs_confirmation'
  | 'missing_quantity_data'

export interface ServingOverride {
  menuItemId: string
  servings: number
}

export type QuantityEvent = Omit<EventInterpretation, 'guestCount'> & { guestCount: number }

export interface CalculateQuantitiesRequest {
  event: QuantityEvent
  menu: EventMenu
  servingOverrides?: ServingOverride[]
}

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
  unit: CanonicalQuantityUnit
  sourceMenuItemIds: string[]
}

export interface UnresolvedQuantity {
  menuItemId: string
  reason: string
}

export interface UnresolvedIngredientQuantity {
  menuItemId: string
  ingredientName: string
  status: 'needs_confirmation'
  reason: string
}

export interface QuantityPlan {
  guestCount: number
  isComplete: boolean
  itemAllocations: ItemAllocation[]
  ingredientRequirements: IngredientRequirement[]
  unresolved: UnresolvedQuantity[]
  unresolvedIngredients: UnresolvedIngredientQuantity[]
  assumptions: string[]
}
