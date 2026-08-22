import { describe, expect, it } from 'vitest'
import type { EventInterpretation } from '../../shared/eventInterpretation'
import type { InterpretationField } from '../domain/planning'
import {
  applyInterpretationFieldEdit,
  toInterpretationFields,
} from './eventInterpretationMapper'

const event: EventInterpretation = {
  eventType: 'birthday',
  guestCount: 35,
  location: 'Zürich',
  date: null,
  time: null,
  mealType: 'dinner',
  serviceStyle: 'seated',
  budgetPerGuest: null,
  totalBudget: null,
  dietaryRequirements: [
    { type: 'vegan', guestCount: 4 },
    { type: 'gluten-free', guestCount: null },
  ],
  additionalNotes: [],
}

describe('event interpretation dietary field mapping', () => {
  it('shows known counts while leaving unknown counts unqualified', () => {
    const field = toInterpretationFields(event).find(({ id }) => id === 'dietaryRequirements')

    expect(field?.value).toBe('vegan (4 guests), gluten-free')
  })

  it('preserves structured counts when a dietary field is edited', () => {
    const field: InterpretationField = {
      id: 'dietaryRequirements',
      label: 'Dietary needs',
      value: 'gluten-free (3 guests), 2 vegan guests, vegetarian',
      editable: true,
    }

    expect(applyInterpretationFieldEdit(event, field).dietaryRequirements).toEqual([
      { type: 'gluten-free', guestCount: 3 },
      { type: 'vegan', guestCount: 2 },
      { type: 'vegetarian', guestCount: null },
    ])
  })
})
