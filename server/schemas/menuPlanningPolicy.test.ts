import { describe, expect, it } from 'vitest'
import type { MenuGenerationInput } from '../ai/menuGenerator.js'
import type { EventMenu } from '../../shared/menu.js'
import { assertNoDerivedPlanningNumbers } from './menuPlanningPolicy.js'

const input: MenuGenerationInput = {
  event: {
    eventType: 'Birthday',
    guestCount: 35,
    location: 'Zürich',
    date: null,
    time: null,
    mealType: 'dinner',
    serviceStyle: 'seated dinner',
    budgetPerGuest: null,
    totalBudget: null,
    dietaryRequirements: [{ type: 'vegan', guestCount: 4 }],
    additionalNotes: [],
  },
}

function menuWithAssumption(assumption: string): EventMenu {
  return {
    title: 'Birthday dinner',
    summary: 'A seated menu with a vegan option.',
    items: [],
    planningAssumptions: [assumption],
  }
}

describe('assertNoDerivedPlanningNumbers', () => {
  it('allows numeric facts explicitly supported by the input', () => {
    expect(() => assertNoDerivedPlanningNumbers(
      input,
      menuWithAssumption('4 guests require a vegan option; allocation is deferred.'),
    )).not.toThrow()
  })

  it('rejects derived subgroup allocations', () => {
    expect(() => assertNoDerivedPlanningNumbers(
      input,
      menuWithAssumption('Plan 31 standard mains and 4 vegan mains.'),
    )).toThrow('derived numeric allocations')
  })

  it('does not allow a count for a dietary requirement whose count is unknown', () => {
    const unknownCountInput: MenuGenerationInput = {
      ...input,
      event: {
        ...input.event,
        dietaryRequirements: [{ type: 'vegan', guestCount: null }],
      },
    }

    expect(() => assertNoDerivedPlanningNumbers(
      unknownCountInput,
      menuWithAssumption('Plan for 4 vegan guests.'),
    )).toThrow('derived numeric allocations')
  })
})
