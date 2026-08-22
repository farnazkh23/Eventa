import { describe, expect, it } from 'vitest'
import {
  compatibleEventInterpretationSchema,
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
      dietaryRequirements: [{ type: 'vegan', guestCount: 4 }],
      additionalNotes: [],
    })

    expect(result.guestCount).toBe(35)
    expect(result.budgetPerGuest).toBeNull()
    expect(result.dietaryRequirements).toEqual([{ type: 'vegan', guestCount: 4 }])
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

  it('distinguishes known and unknown dietary guest counts', () => {
    const result = eventInterpretationSchema.parse({
      eventType: null,
      guestCount: 40,
      location: null,
      date: null,
      time: null,
      mealType: null,
      serviceStyle: null,
      budgetPerGuest: null,
      totalBudget: null,
      dietaryRequirements: [
        { type: 'gluten-free', guestCount: 3 },
        { type: 'vegetarian', guestCount: null },
        { type: 'vegan', guestCount: 2 },
      ],
      additionalNotes: [],
    })

    expect(result.dietaryRequirements).toHaveLength(3)
    expect(result.dietaryRequirements[1]?.guestCount).toBeNull()
  })

  it('accepts legacy string requirements only through the compatibility schema', () => {
    const payload = {
      eventType: null,
      guestCount: 20,
      location: null,
      date: null,
      time: null,
      mealType: null,
      serviceStyle: null,
      budgetPerGuest: null,
      totalBudget: null,
      dietaryRequirements: ['vegetarian'],
      additionalNotes: [],
    }

    expect(eventInterpretationSchema.safeParse(payload).success).toBe(false)
    expect(compatibleEventInterpretationSchema.parse(payload).dietaryRequirements).toEqual([
      { type: 'vegetarian', guestCount: null },
    ])
  })
})
