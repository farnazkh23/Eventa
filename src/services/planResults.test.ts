import { describe, expect, it, vi } from 'vitest'
import { calculateQuantities, matchProducts, PlanResultsServiceError } from './planResults'

const event = { eventType: 'Dinner', guestCount: 10, location: 'Bern', date: null, time: null, mealType: 'Dinner', serviceStyle: 'Buffet', budgetPerGuest: null, totalBudget: null, dietaryRequirements: [], additionalNotes: [] }
const menu = { title: 'Menu', summary: 'Summary', planningAssumptions: [], items: [{ id: 'main', course: 'main' as const, name: 'Main', description: 'Main dish', dietaryTags: [], portion: null, ingredients: [], servingScope: 'all_guests' as const }] }
const ingredient = { ingredientKey: 'rice:g', name: 'Rice', amount: 1000, unit: 'g' as const, sourceMenuItemIds: ['main'] }

describe('planning result services', () => {
  it('preserves partial quantity statuses from the backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ guestCount: 10, isComplete: false, itemAllocations: [{ menuItemId: 'main', menuItemName: 'Main', course: 'main', plannedServings: null, status: 'needs_confirmation', reason: 'Confirm servings' }], ingredientRequirements: [ingredient], unresolved: [{ menuItemId: 'main', reason: 'Confirm servings' }], assumptions: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const result = await calculateQuantities(event, menu)
    expect(result.itemAllocations[0]).toMatchObject({ status: 'needs_confirmation', plannedServings: null })
    expect(result.unresolvedIngredients).toEqual([])
    fetchMock.mockRestore()
  })

  it('rejects malformed product results rather than fabricating a match', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ matches: [{ status: 'matched' }], summary: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    await expect(matchProducts([ingredient])).rejects.toBeInstanceOf(PlanResultsServiceError)
    fetchMock.mockRestore()
  })
})
