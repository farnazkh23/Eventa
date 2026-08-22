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
    dietaryRequirements: ['vegan'],
    additionalNotes: ['4 guests are vegan'],
  },
  originalDescription: 'Birthday dinner for 35 guests. 4 are vegan.',
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
})
