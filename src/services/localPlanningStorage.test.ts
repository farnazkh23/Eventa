import { describe, expect, it } from 'vitest'
import { parsePantryBasics, parseTemplates } from './localPlanningStorage'

describe('local planning storage', () => {
  it('accepts valid reusable templates', () => {
    const templates = parseTemplates(JSON.stringify([{
      id: 'template-1',
      name: 'Company Summer Party',
      createdAt: '2026-08-22T10:00:00.000Z',
      originalDescription: 'Summer party for 120 guests',
      event: {
        eventType: 'corporate party', guestCount: 120, location: 'Bern', date: null,
        time: null, mealType: 'dinner', serviceStyle: 'buffet', budgetPerGuest: 50,
        totalBudget: null, dietaryRequirements: [{ type: 'vegan', guestCount: 8 }],
        additionalNotes: [],
      },
    }]))
    expect(templates[0]?.event.dietaryRequirements[0]?.guestCount).toBe(8)
  })

  it('rejects malformed template storage', () => {
    expect(parseTemplates('[{"name":"Incomplete"}]')).toEqual([])
  })

  it('accepts only structured pantry basics', () => {
    expect(parsePantryBasics(JSON.stringify([{
      id: 'basic-1', name: 'Olive oil', preferredProduct: null, bulkPackPreference: null,
    }]))).toHaveLength(1)
    expect(parsePantryBasics('["olive oil"]')).toEqual([])
  })
})
