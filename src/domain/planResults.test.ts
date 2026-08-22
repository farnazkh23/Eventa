import { describe, expect, it } from 'vitest'
import type { EventMenu } from '../../shared/menu'
import { findMenuItem, getPlanResults } from './planResults'

const menu: EventMenu = {
  title: 'Test menu',
  summary: 'Summary',
  planningAssumptions: [],
  items: [{
    id: 'salad',
    course: 'starter',
    name: 'Green salad',
    description: 'Fresh salad',
    dietaryTags: ['vegetarian'],
    portion: null,
    ingredients: [],
    servingScope: 'all_guests',
  }],
}

describe('plan results adapter', () => {
  it('keeps backend-derived results explicitly pending', () => {
    const results = getPlanResults()
    expect(results.quantities.status).toBe('pending')
    expect(results.products.status).toBe('pending')
    expect(results.budget.status).toBe('pending')
  })

  it('finds only existing menu items', () => {
    expect(findMenuItem(menu, 'salad')?.name).toBe('Green salad')
    expect(findMenuItem(menu, 'missing')).toBeNull()
  })
})
