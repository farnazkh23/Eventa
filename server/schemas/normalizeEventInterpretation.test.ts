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
      dietaryRequirements: [' Vegetarian ', 'vegetarian', 'GLUTEN-FREE'],
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
      dietaryRequirements: ['vegetarian', 'gluten-free'],
      additionalNotes: ['Relaxed atmosphere'],
    })
  })
})
