import type { DietaryRequirement, EventInterpretation } from '../../shared/eventInterpretation.js'
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

function normalizeDietaryRequirements(
  values: ValidatedEventInterpretation['dietaryRequirements'],
): DietaryRequirement[] {
  const normalized = values
    .map(({ type, guestCount }) => ({
      type: type.trim().toLocaleLowerCase('en'),
      guestCount,
    }))
    .filter(({ type }) => Boolean(type))

  return [...new Map(
    normalized.map((requirement) => [
      `${requirement.type}\u0000${requirement.guestCount ?? 'unknown'}`,
      requirement,
    ]),
  ).values()]
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
    dietaryRequirements: normalizeDietaryRequirements(input.dietaryRequirements),
    additionalNotes: uniqueNormalized(input.additionalNotes, false),
  }

  return eventInterpretationSchema.parse(normalized)
}
