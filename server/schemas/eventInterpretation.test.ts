import { describe, expect, it } from 'vitest'
import {
  eventInterpretationSchema,
  interpretEventRequestSchema,
} from './eventInterpretation.js'

describe('interpretEventRequestSchema', () => {
  it('accepts and trims a valid event description', () => {
    const result = interpretEventRequestSchema.parse({
      description: '  Planning an event for around 80 people.  ',
    })

    expect(result.description).toBe('Planning an event for around 80 people.')
  })

  it.each([
    {},
    { description: '' },
    { description: 'too short' },
    { description: 120 },
    { description: 'A valid event description', unexpected: true },
  ])('rejects invalid request payload %#', (payload) => {
    expect(interpretEventRequestSchema.safeParse(payload).success).toBe(false)
  })
})

describe('eventInterpretationSchema', () => {
  it('accepts a representative extraction with explicitly missing facts', () => {
    const result = eventInterpretationSchema.parse({
      eventType: 'birthday',
      guestCount: 35,
      location: 'Zürich',
      date: null,
      time: null,
      mealType: 'dinner',
      serviceStyle: 'seated',
      budgetPerGuest: null,
      totalBudget: null,
      dietaryRequirements: ['vegan'],
      additionalNotes: ['4 guests are vegan'],
    })

    expect(result.guestCount).toBe(35)
    expect(result.budgetPerGuest).toBeNull()
  })

  it('rejects missing keys and invalid numeric values', () => {
    const invalid = {
      eventType: null,
      guestCount: '35',
      location: null,
      dietaryRequirements: [],
      additionalNotes: [],
    }

    expect(eventInterpretationSchema.safeParse(invalid).success).toBe(false)
  })
})
