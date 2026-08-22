import { describe, expect, it } from 'vitest'
import { createStableMenuItemId, normalizeMenu } from './normalizeMenu.js'

const rawMenu = {
  title: '  Basel Apéro  ',
  summary: ' Finger food for a standing reception. ',
  items: [
    {
      course: 'vegetarian' as const,
      name: '  Roasted Vegetable Skewer ',
      description: ' Seasonal vegetables with herbs. ',
      dietaryTags: [' Vegetarian ', 'vegetarian', 'GLUTEN-FREE'],
      portion: { amount: 2, unit: 'pieces' },
      ingredients: [
        { name: ' Bell Pepper ', amountPerServing: 40, unit: 'grams' },
        { name: ' Olive Oil ', amountPerServing: 5, unit: 'milliliters' },
      ],
      servingScope: 'shared' as const,
      dietaryAllocationType: null,
    },
    {
      course: 'dessert' as const,
      name: 'Berry panna cotta',
      description: 'A small berry dessert.',
      dietaryTags: ['gluten-free'],
      portion: null,
      ingredients: [{ name: 'Cream', amountPerServing: null, unit: null }],
      servingScope: 'all_guests' as const,
      dietaryAllocationType: null,
    },
  ],
  planningAssumptions: [' Portions are per guest. ', 'Portions are per guest.'],
}

describe('normalizeMenu', () => {
  it('normalizes matching fields without calculating totals or prices', () => {
    const result = normalizeMenu(rawMenu)
    expect(result.title).toBe('Basel Apéro')
    expect(result.items[0]).toMatchObject({
      name: 'Roasted Vegetable Skewer',
      dietaryTags: ['vegetarian', 'gluten-free'],
      portion: { amount: 2, unit: 'piece' },
      ingredients: [
        { name: 'bell pepper', amountPerServing: 40, unit: 'g' },
        { name: 'olive oil', amountPerServing: 5, unit: 'ml' },
      ],
    })
    expect(result.planningAssumptions).toEqual(['Portions are per guest.'])
    expect(result).not.toHaveProperty('totalCost')
    expect(result).not.toHaveProperty('packageCount')
  })
})

describe('createStableMenuItemId', () => {
  it('returns the same ID for equivalent normalized names', () => {
    expect(createStableMenuItemId('main', 'Mushroom Risotto')).toBe(
      createStableMenuItemId('main', '  mushroom   risotto '),
    )
  })

  it('changes when the course or dish identity changes', () => {
    expect(createStableMenuItemId('main', 'Mushroom Risotto')).not.toBe(
      createStableMenuItemId('vegetarian', 'Mushroom Risotto'),
    )
    expect(createStableMenuItemId('main', 'Mushroom Risotto')).not.toBe(
      createStableMenuItemId('main', 'Roasted Chicken'),
    )
  })
})
