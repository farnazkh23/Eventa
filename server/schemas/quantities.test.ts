import { describe, expect, it } from 'vitest'
import type { EventMenu } from '../../shared/menu.js'
import { calculateQuantitiesRequestSchema, quantityPlanSchema } from './quantities.js'

const menu: EventMenu = {
  title: 'Test menu',
  summary: 'Schema fixture',
  items: [
    {
      id: 'main',
      course: 'main',
      name: 'Main',
      description: 'Main dish',
      dietaryTags: [],
      portion: null,
      ingredients: [{ name: 'ingredient', amountPerServing: 100, unit: 'g' }],
      servingScope: 'all_guests',
    },
    {
      id: 'dessert',
      course: 'dessert',
      name: 'Dessert',
      description: 'Dessert dish',
      dietaryTags: [],
      portion: null,
      ingredients: [{ name: 'dessert', amountPerServing: 1, unit: 'piece' }],
      servingScope: 'all_guests',
    },
  ],
  planningAssumptions: [],
}

const event = {
  eventType: null,
  guestCount: 35,
  location: null,
  date: null,
  time: null,
  mealType: null,
  serviceStyle: null,
  budgetPerGuest: null,
  totalBudget: null,
  dietaryRequirements: [{ type: 'vegan', guestCount: 4 }],
  additionalNotes: [],
}

describe('calculateQuantitiesRequestSchema', () => {
  it('accepts a valid confirmed event, menu, and override', () => {
    expect(calculateQuantitiesRequestSchema.safeParse({
      event,
      menu,
      servingOverrides: [{ menuItemId: 'main', servings: 31 }],
    }).success).toBe(true)
  })

  const invalidOverrides: Array<Array<{ menuItemId: string; servings: number }>> = [
    [{ menuItemId: 'main', servings: -1 }],
    [{ menuItemId: 'main', servings: 1.5 }],
    [{ menuItemId: 'main', servings: 36 }],
    [{ menuItemId: 'missing', servings: 1 }],
    [{ menuItemId: 'main', servings: 20 }, { menuItemId: 'main', servings: 21 }],
  ]

  it.each(invalidOverrides)('I: rejects invalid serving overrides %#', (servingOverrides) => {
    expect(calculateQuantitiesRequestSchema.safeParse({ event, menu, servingOverrides }).success)
      .toBe(false)
  })

  it('requires a known event guest count', () => {
    expect(calculateQuantitiesRequestSchema.safeParse({
      event: { ...event, guestCount: null },
      menu,
    }).success).toBe(false)
  })
})

describe('quantityPlanSchema', () => {
  it('accepts partial results with unresolved allocations', () => {
    expect(quantityPlanSchema.safeParse({
      guestCount: 35,
      isComplete: false,
      itemAllocations: [{
        menuItemId: 'main',
        menuItemName: 'Main',
        course: 'main',
        plannedServings: null,
        status: 'needs_confirmation',
        reason: 'Dietary count is unknown.',
      }],
      ingredientRequirements: [],
      unresolved: [{ menuItemId: 'main', reason: 'Dietary count is unknown.' }],
      unresolvedIngredients: [],
      assumptions: ['No buffer is included.'],
    }).success).toBe(true)
  })
})
