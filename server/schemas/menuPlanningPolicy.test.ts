import { describe, expect, it } from 'vitest'
import type { MenuGenerationInput } from '../ai/menuGenerator.js'
import type { EventMenu } from '../../shared/menu.js'
import { assertMenuPlanningPolicy, assertNoDerivedPlanningNumbers } from './menuPlanningPolicy.js'

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

function item(overrides: Partial<EventMenu['items'][number]> = {}): EventMenu['items'][number] {
  return {
    id: 'main-standard',
    course: 'main',
    name: 'Roasted chicken',
    description: 'Chicken with vegetables.',
    dietaryTags: [],
    portion: null,
    ingredients: [{ name: 'chicken', amountPerServing: 180, unit: 'g' }],
    servingScope: 'all_guests',
    ...overrides,
  }
}

function plannedMenu(items: EventMenu['items']): EventMenu {
  return {
    title: 'Birthday dinner',
    summary: 'A seated menu with dietary alternatives.',
    items,
    planningAssumptions: [],
  }
}

describe('assertMenuPlanningPolicy', () => {
  it('requires complete per-serving ingredient metadata before accepting a first proposal', () => {
    const menu = plannedMenu([item({
      dietaryTags: ['vegan'],
      servingScope: 'dietary_option',
      ingredients: [{ name: 'sparkling water', amountPerServing: null, unit: null }],
    })])

    expect(() => assertMenuPlanningPolicy(input, menu)).toThrow('missing a per-serving quantity')
    expect(() => assertMenuPlanningPolicy(input, menu, {
      allowMissingIngredientQuantities: true,
    })).not.toThrow()
  })

  it('always rejects mismatched or unsupported quantity metadata', () => {
    expect(() => assertMenuPlanningPolicy(input, plannedMenu([
      item({ dietaryTags: ['vegan'], servingScope: 'dietary_option', ingredients: [
        { name: 'oil', amountPerServing: 10, unit: null },
      ] }),
    ]), { allowMissingIngredientQuantities: true })).toThrow('must provide both')

    expect(() => assertMenuPlanningPolicy(input, plannedMenu([
      item({ dietaryTags: ['vegan'], servingScope: 'dietary_option', ingredients: [
        { name: 'oil', amountPerServing: 1, unit: 'tablespoon' },
      ] }),
    ]), { allowMissingIngredientQuantities: true })).toThrow('unsupported unit')
  })

  it('requires a dedicated dietary main to use dietary_option scope', () => {
    const menu = plannedMenu([
      item(),
      item({ id: 'vegan', course: 'main', name: 'Vegan risotto', dietaryTags: ['vegan'] }),
    ])

    expect(() => assertMenuPlanningPolicy(input, menu)).toThrow('dietary_option serving scope')
  })

  it('requires main-course coverage for every confirmed dietary requirement', () => {
    expect(() => assertMenuPlanningPolicy(input, plannedMenu([item()]))).toThrow(
      'No main-course option supports dietary requirement vegan',
    )
  })

  it('accepts a quantified standard main and dietary alternative', () => {
    const menu = plannedMenu([
      item(),
      item({
        id: 'vegan',
        course: 'main',
        name: 'Vegan risotto',
        dietaryTags: ['vegan'],
        servingScope: 'dietary_option',
      }),
    ])

    expect(() => assertMenuPlanningPolicy(input, menu)).not.toThrow()
  })

  it('does not use a vegan option to hide an incorrectly scoped vegetarian alternative', () => {
    const vegetarianInput: MenuGenerationInput = {
      ...input,
      event: {
        ...input.event,
        dietaryRequirements: [
          { type: 'vegetarian', guestCount: null },
          { type: 'vegan', guestCount: 4 },
        ],
      },
    }
    const menu = plannedMenu([
      item(),
      item({ id: 'vegetarian', name: 'Vegetarian tart', dietaryTags: ['vegetarian'] }),
      item({
        id: 'vegan',
        name: 'Vegan risotto',
        dietaryTags: ['vegan'],
        servingScope: 'dietary_option',
      }),
    ])

    expect(() => assertMenuPlanningPolicy(vegetarianInput, menu)).toThrow(
      'vegetarian main-course alternative must use dietary_option serving scope',
    )
  })
})

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
