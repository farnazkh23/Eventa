import { describe, expect, it, vi } from 'vitest'
import { calculateQuantities, createPurchasingPlan, matchProducts, PlanResultsServiceError } from './planResults'

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

  it('sends confirmed serving overrides back for recalculation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ guestCount: 10, isComplete: true, itemAllocations: [{ menuItemId: 'main', menuItemName: 'Main', course: 'main', plannedServings: 4, status: 'calculated' }], ingredientRequirements: [ingredient], unresolved: [], unresolvedIngredients: [], assumptions: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    await calculateQuantities(event, menu, [{ menuItemId: 'main', servings: 4 }])
    const request = fetchMock.mock.calls[0]?.[1]
    expect(JSON.parse(String(request?.body))).toMatchObject({ servingOverrides: [{ menuItemId: 'main', servings: 4 }] })
    fetchMock.mockRestore()
  })

  it('rejects malformed product results rather than fabricating a match', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ matches: [{ status: 'matched' }], summary: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    await expect(matchProducts([ingredient])).rejects.toBeInstanceOf(PlanResultsServiceError)
    fetchMock.mockRestore()
  })

  it('reports an unavailable purchasing endpoint explicitly', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 404 }))
    const emptyMatches = { matches: [], summary: { totalIngredients: 0, matched: 0, lowConfidence: 0, unresolved: 0, selectedProductsWithPrice: 0 } }
    await expect(createPurchasingPlan(event, emptyMatches)).rejects.toThrow('Budget calculation is not available from the current backend yet.')
    fetchMock.mockRestore()
  })
})
