import { describe, expect, it } from 'vitest'
import { demoBrief } from './mockPlanningService'

describe('Eventa demo brief', () => {
  it('provides the complete example only when selected by the user', () => {
    expect(demoBrief).toBe(
      'Corporate summer party for 120 people in Bern. We want a relaxed dinner buffet with one meat main, one vegetarian option and one vegan option for 8 guests. 5 guests are gluten-free. Budget is around CHF 50 per person. Please include a fresh starter, two side dishes, dessert and non-alcoholic drinks.',
    )
  })
})
