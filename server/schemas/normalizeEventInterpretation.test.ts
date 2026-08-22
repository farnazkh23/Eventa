import { describe, expect, it } from 'vitest'
import { normalizeEventInterpretation } from './normalizeEventInterpretation.js'

describe('normalizeEventInterpretation', () => {
  it('trims scalar text and normalizes dietary values without calculations', () => {
    const result = normalizeEventInterpretation({
      eventType: ' Corporate event ',
      guestCount: 120,
      location: ' Bern ',
      date: null,
      time: null,
      mealType: null,
      serviceStyle: ' buffet ',
      budgetPerGuest: 45,
      totalBudget: null,
      dietaryRequirements: [
        { type: ' Vegetarian ', guestCount: null },
        { type: 'vegetarian', guestCount: null },
        { type: 'GLUTEN-FREE', guestCount: 3 },
      ],
      additionalNotes: [' Relaxed atmosphere ', 'Relaxed atmosphere'],
    })

    expect(result).toEqual({
      eventType: 'Corporate event',
      guestCount: 120,
      location: 'Bern',
      date: null,
      time: null,
      mealType: null,
      serviceStyle: 'buffet',
      budgetPerGuest: 45,
      totalBudget: null,
      dietaryRequirements: [
        { type: 'vegetarian', guestCount: null },
        { type: 'gluten-free', guestCount: 3 },
      ],
      additionalNotes: ['Relaxed atmosphere'],
    })
  })
})
