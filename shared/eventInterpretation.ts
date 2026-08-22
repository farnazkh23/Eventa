export interface EventInterpretation {
  eventType: string | null
  guestCount: number | null
  location: string | null
  date: string | null
  time: string | null
  mealType: string | null
  serviceStyle: string | null
  budgetPerGuest: number | null
  totalBudget: number | null
  dietaryRequirements: string[]
  additionalNotes: string[]
}

export interface InterpretEventRequest {
  description: string
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
  }
}
