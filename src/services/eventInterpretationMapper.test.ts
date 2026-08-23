import { describe, expect, it } from 'vitest'
import type { PlanningEventInterpretation } from '../domain/planning'
import { applyInterpretationFieldEdit, toInterpretationFields } from './eventInterpretationMapper'

const event: PlanningEventInterpretation = {
  eventType: 'corporate party',
  guestCount: 120,
  location: 'Bern',
  date: null,
  time: null,
  mealType: 'dinner',
  serviceStyle: 'buffet',
  budgetPerGuest: 50,
  totalBudget: null,
  dietaryRequirements: [
    { type: 'vegetarian', guestCount: null },
    { type: 'vegan', guestCount: 8 },
    { type: 'gluten-free', guestCount: 5 },
  ],
  additionalNotes: [],
}

describe('event interpretation mapper', () => {
  it('displays dietary counts while keeping null unspecified', () => {
    const field = toInterpretationFields(event).find(({ id }) => id === 'dietaryRequirements')
    expect(field?.value).toBe('vegetarian, vegan (8 guests), gluten-free (5 guests)')
  })

  it('preserves counts when dietary requirements are edited', () => {
    const updated = applyInterpretationFieldEdit(event, {
      id: 'dietaryRequirements',
      label: 'Dietary needs',
      value: 'vegetarian, vegan (8 guests), gluten-free (5 guests)',
      editable: true,
    })

    expect(updated.dietaryRequirements).toEqual(event.dietaryRequirements)
  })

  it('keeps zero distinct from an unspecified count', () => {
    const updated = applyInterpretationFieldEdit(event, {
      id: 'dietaryRequirements',
      label: 'Dietary needs',
      value: 'vegan (0 guests), vegetarian',
      editable: true,
    })

    expect(updated.dietaryRequirements).toEqual([
      { type: 'vegan', guestCount: 0 },
      { type: 'vegetarian', guestCount: null },
    ])
  })
})
