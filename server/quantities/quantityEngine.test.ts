import { describe, expect, it } from 'vitest'
import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import type { EventMenu, MenuItem } from '../../shared/menu.js'
import type { CalculateQuantitiesRequest } from '../../shared/quantities.js'
import { calculateQuantityPlan } from './quantityEngine.js'

function event(
  guestCount: number,
  dietaryRequirements: EventInterpretation['dietaryRequirements'] = [],
): CalculateQuantitiesRequest['event'] {
  return {
    eventType: null,
    guestCount,
    location: null,
    date: null,
    time: null,
    mealType: null,
    serviceStyle: null,
    budgetPerGuest: null,
    totalBudget: null,
    dietaryRequirements,
    additionalNotes: [],
  }
}

function item(overrides: Partial<MenuItem> & Pick<MenuItem, 'id' | 'name'>): MenuItem {
  return {
    course: 'main',
    description: 'Fixture item',
    dietaryTags: [],
    portion: null,
    ingredients: [{ name: overrides.name, amountPerServing: 100, unit: 'g' }],
    servingScope: 'all_guests',
    ...overrides,
  }
}

function menu(items: MenuItem[]): EventMenu {
  return {
    title: 'Fixture menu',
    summary: 'Deterministic quantity fixture',
    items,
    planningAssumptions: [],
  }
}

function allocation(plan: ReturnType<typeof calculateQuantityPlan>, id: string) {
  return plan.itemAllocations.find(({ menuItemId }) => menuItemId === id)
}

describe('calculateQuantityPlan serving allocation', () => {
  it('A: subtracts one known dietary audience from its standard course', () => {
    const plan = calculateQuantityPlan({
      event: event(35, [{ type: 'vegan', guestCount: 4 }]),
      menu: menu([
        item({ id: 'beef', name: 'Beef main', ingredients: [
          { name: 'beef', amountPerServing: 180, unit: 'g' },
        ] }),
        item({
          id: 'vegan',
          name: 'Vegan main',
          course: 'vegan',
          dietaryTags: ['vegan'],
          servingScope: 'dietary_option',
          ingredients: [{ name: 'tofu', amountPerServing: 150, unit: 'g' }],
        }),
      ]),
    })

    expect(allocation(plan, 'beef')?.plannedServings).toBe(31)
    expect(allocation(plan, 'vegan')?.plannedServings).toBe(4)
    expect(plan.ingredientRequirements).toEqual([
      { ingredientKey: 'beef:g', name: 'beef', amount: 5580, unit: 'g', sourceMenuItemIds: ['beef'] },
      { ingredientKey: 'tofu:g', name: 'tofu', amount: 600, unit: 'g', sourceMenuItemIds: ['vegan'] },
    ])
    expect(plan.isComplete).toBe(true)
  })

  it('B: leaves an unknown dietary option and affected standard course unresolved', () => {
    const plan = calculateQuantityPlan({
      event: event(120, [{ type: 'vegetarian', guestCount: null }]),
      menu: menu([
        item({ id: 'standard', name: 'Standard main' }),
        item({
          id: 'vegetarian',
          name: 'Vegetarian main',
          course: 'vegetarian',
          dietaryTags: ['vegetarian'],
          servingScope: 'dietary_option',
        }),
        item({ id: 'salad', name: 'Salad', course: 'starter' }),
      ]),
    })

    expect(allocation(plan, 'standard')).toMatchObject({
      plannedServings: null,
      status: 'needs_confirmation',
    })
    expect(allocation(plan, 'vegetarian')).toMatchObject({
      plannedServings: null,
      status: 'needs_confirmation',
    })
    expect(allocation(plan, 'salad')).toMatchObject({
      plannedServings: 120,
      status: 'calculated',
    })
    expect(plan.ingredientRequirements).toHaveLength(1)
    expect(plan.isComplete).toBe(false)
  })

  it('C: does not invent overlap assumptions for several dietary groups', () => {
    const plan = calculateQuantityPlan({
      event: event(40, [
        { type: 'gluten-free', guestCount: 3 },
        { type: 'vegan', guestCount: 2 },
        { type: 'vegetarian', guestCount: null },
      ]),
      menu: menu([
        item({ id: 'standard', name: 'Standard main' }),
        item({ id: 'gf', name: 'Gluten-free main', dietaryTags: ['gluten-free'], servingScope: 'dietary_option' }),
        item({ id: 'vegan', name: 'Vegan main', course: 'vegan', dietaryTags: ['vegan'], servingScope: 'dietary_option' }),
        item({ id: 'vegetarian', name: 'Vegetarian main', course: 'vegetarian', dietaryTags: ['vegetarian'], servingScope: 'dietary_option' }),
      ]),
    })

    expect(allocation(plan, 'gf')?.plannedServings).toBe(3)
    expect(allocation(plan, 'vegan')?.plannedServings).toBe(2)
    expect(allocation(plan, 'vegetarian')?.plannedServings).toBeNull()
    expect(allocation(plan, 'standard')?.plannedServings).toBeNull()
    expect(plan.itemAllocations.some(({ plannedServings }) => plannedServings === 35)).toBe(false)
  })

  it('keeps the standard course unresolved when multiple known audiences may overlap', () => {
    const plan = calculateQuantityPlan({
      event: event(35, [
        { type: 'gluten-free', guestCount: 3 },
        { type: 'vegan', guestCount: 2 },
      ]),
      menu: menu([
        item({ id: 'standard', name: 'Standard main' }),
        item({ id: 'gf', name: 'Gluten-free main', dietaryTags: ['gluten-free'], servingScope: 'dietary_option' }),
        item({ id: 'vegan', name: 'Vegan main', course: 'vegan', dietaryTags: ['vegan'], servingScope: 'dietary_option' }),
      ]),
    })

    expect(allocation(plan, 'gf')?.plannedServings).toBe(3)
    expect(allocation(plan, 'vegan')?.plannedServings).toBe(2)
    expect(allocation(plan, 'standard')).toMatchObject({
      plannedServings: null,
      status: 'needs_confirmation',
      reason: expect.stringContaining('overlap'),
    })
  })

  it('keeps a dedicated vegan option ambiguous when another dietary tag is not universal', () => {
    const plan = calculateQuantityPlan({
      event: event(35, [
        { type: 'gluten-free', guestCount: 3 },
        { type: 'vegan', guestCount: 2 },
      ]),
      menu: menu([
        item({ id: 'standard', name: 'Standard main' }),
        item({
          id: 'vegan',
          name: 'Gluten-free vegan main',
          course: 'vegan',
          dietaryTags: ['vegan', 'gluten-free'],
          servingScope: 'dietary_option',
        }),
      ]),
    })

    expect(allocation(plan, 'vegan')).toMatchObject({
      plannedServings: null,
      status: 'needs_confirmation',
      reason: expect.stringContaining('overlap'),
    })
    expect(allocation(plan, 'standard')?.plannedServings).toBeNull()
  })

  it('uses an explicit dietary allocation audience while retaining compatibility tags', () => {
    const plan = calculateQuantityPlan({
      event: event(35, [
        { type: 'gluten-free', guestCount: 3 },
        { type: 'vegan', guestCount: 2 },
      ]),
      menu: menu([
        item({ id: 'standard', name: 'Standard main' }),
        item({
          id: 'vegan',
          name: 'Gluten-free vegan main',
          dietaryTags: ['vegan', 'gluten-free'],
          servingScope: 'dietary_option',
          dietaryAllocationType: 'vegan',
        }),
      ]),
    })

    expect(allocation(plan, 'vegan')?.plannedServings).toBe(2)
    expect(allocation(plan, 'standard')?.plannedServings).toBe(33)
  })

  it('does not treat a whole-course dietary compatibility tag as another allocation audience', () => {
    const plan = calculateQuantityPlan({
      event: event(35, [
        { type: 'gluten-free', guestCount: 3 },
        { type: 'vegan', guestCount: 2 },
      ]),
      menu: menu([
        item({ id: 'standard', name: 'Gluten-free standard main', dietaryTags: ['gluten-free'] }),
        item({
          id: 'vegan',
          name: 'Gluten-free vegan main',
          course: 'vegan',
          dietaryTags: ['vegan', 'gluten-free'],
          servingScope: 'dietary_option',
        }),
      ]),
    })

    expect(allocation(plan, 'vegan')?.plannedServings).toBe(2)
    expect(allocation(plan, 'standard')?.plannedServings).toBe(33)
  })

  it('uses the full guest count for shared items', () => {
    const plan = calculateQuantityPlan({
      event: event(25),
      menu: menu([item({ id: 'bread', name: 'Bread', course: 'side', servingScope: 'shared' })]),
    })

    expect(allocation(plan, 'bread')?.plannedServings).toBe(25)
  })
})

describe('calculateQuantityPlan ingredient totals', () => {
  it('E: aggregates normalized ingredient names and converted compatible units', () => {
    const plan = calculateQuantityPlan({
      event: event(10),
      menu: menu([
        item({ id: 'one', name: 'One', ingredients: [{ name: ' Butter ', amountPerServing: 20, unit: 'g' }] }),
        item({ id: 'two', name: 'Two', course: 'side', ingredients: [{ name: 'butter', amountPerServing: 0.005, unit: 'kg' }] }),
      ]),
    })

    expect(plan.ingredientRequirements).toEqual([{
      ingredientKey: 'butter:g',
      name: 'butter',
      amount: 250,
      unit: 'g',
      sourceMenuItemIds: ['one', 'two'],
    }])
  })

  it('F: keeps the same ingredient separate across incompatible dimensions', () => {
    const plan = calculateQuantityPlan({
      event: event(10),
      menu: menu([
        item({ id: 'mass', name: 'Mass', ingredients: [{ name: 'tomato', amountPerServing: 50, unit: 'g' }] }),
        item({ id: 'volume', name: 'Volume', course: 'side', ingredients: [{ name: 'tomato', amountPerServing: 20, unit: 'ml' }] }),
      ]),
    })

    expect(plan.ingredientRequirements.map(({ ingredientKey }) => ingredientKey)).toEqual([
      'tomato:g',
      'tomato:ml',
    ])
  })

  it('G: reports missing quantities without creating fake zero requirements', () => {
    const plan = calculateQuantityPlan({
      event: event(10),
      menu: menu([item({
        id: 'incomplete',
        name: 'Incomplete',
        ingredients: [
          { name: 'mystery ingredient', amountPerServing: null, unit: null },
          { name: 'known ingredient', amountPerServing: 10, unit: 'g' },
        ],
      })]),
    })

    expect(allocation(plan, 'incomplete')).toMatchObject({
      plannedServings: 10,
      status: 'missing_quantity_data',
    })
    expect(plan.ingredientRequirements).toEqual([{
      ingredientKey: 'known ingredient:g',
      name: 'known ingredient',
      amount: 100,
      unit: 'g',
      sourceMenuItemIds: ['incomplete'],
    }])
    expect(plan.ingredientRequirements.some(({ name }) => name === 'mystery ingredient')).toBe(false)
    expect(plan.unresolvedIngredients).toEqual([{
      menuItemId: 'incomplete',
      ingredientName: 'mystery ingredient',
      status: 'needs_confirmation',
      reason: 'Missing per-serving amount for mystery ingredient.',
    }])
  })

  it('marks unsupported units unresolved instead of guessing a conversion', () => {
    const plan = calculateQuantityPlan({
      event: event(10),
      menu: menu([item({
        id: 'unsupported',
        name: 'Unsupported',
        ingredients: [{ name: 'oil', amountPerServing: 1, unit: 'tablespoon' }],
      })]),
    })

    expect(allocation(plan, 'unsupported')?.status).toBe('missing_quantity_data')
    expect(plan.ingredientRequirements).toEqual([])
    expect(plan.unresolvedIngredients).toEqual([expect.objectContaining({
      menuItemId: 'unsupported',
      ingredientName: 'oil',
      status: 'needs_confirmation',
    })])
  })

  it('H: applies an explicit serving override deterministically', () => {
    const input: CalculateQuantitiesRequest = {
      event: event(20, [{ type: 'vegan', guestCount: null }]),
      menu: menu([
        item({ id: 'standard', name: 'Standard main' }),
        item({ id: 'vegan', name: 'Vegan main', course: 'vegan', dietaryTags: ['vegan'], servingScope: 'dietary_option' }),
      ]),
      servingOverrides: [{ menuItemId: 'vegan', servings: 5 }],
    }

    const plan = calculateQuantityPlan(input)
    expect(allocation(plan, 'vegan')?.plannedServings).toBe(5)
    expect(allocation(plan, 'standard')?.plannedServings).toBe(15)
  })

  it('J: returns exactly the same result for the same input', () => {
    const input: CalculateQuantitiesRequest = {
      event: event(12),
      menu: menu([item({ id: 'deterministic', name: 'Deterministic item' })]),
    }

    expect(calculateQuantityPlan(input)).toEqual(calculateQuantityPlan(input))
  })
})
