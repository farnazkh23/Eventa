import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import {
  eventInterpretationSchema,
  type ValidatedEventInterpretation,
} from './eventInterpretation.js'

function normalizeOptionalText(value: string | null): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function uniqueNormalized(values: string[], lowercase: boolean): string[] {
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (lowercase ? value.toLocaleLowerCase('en') : value))

  return [...new Set(normalized)]
}

export function normalizeEventInterpretation(
  input: ValidatedEventInterpretation,
): EventInterpretation {
  const normalized: EventInterpretation = {
    eventType: normalizeOptionalText(input.eventType),
    guestCount: input.guestCount,
    location: normalizeOptionalText(input.location),
    date: normalizeOptionalText(input.date),
    time: normalizeOptionalText(input.time),
    mealType: normalizeOptionalText(input.mealType),
    serviceStyle: normalizeOptionalText(input.serviceStyle),
    budgetPerGuest: input.budgetPerGuest,
    totalBudget: input.totalBudget,
    dietaryRequirements: uniqueNormalized(input.dietaryRequirements, true),
    additionalNotes: uniqueNormalized(input.additionalNotes, false),
  }

  return eventInterpretationSchema.parse(normalized)
}
