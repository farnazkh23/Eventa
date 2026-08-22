import { describe, expect, it, vi } from 'vitest'
import { KiconnectProvider } from './kiconnectProvider.js'

describe('KiconnectProvider', () => {
  it('validates and normalizes event interpretation through the shared Eventa schema', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      eventType: ' Corporate ', guestCount: 120, location: ' Bern ', date: null, time: null,
      mealType: null, serviceStyle: 'buffet', budgetPerGuest: 45, totalBudget: null,
      dietaryRequirements: [{ type: ' Vegetarian ', guestCount: null }], additionalNotes: [],
    }) } }] }), { status: 200 }))
    const provider = new KiconnectProvider('key', 'https://example.test/api/v1', 'model', { fetchImplementation })
    await expect(provider.interpret('Company event for 120 guests')).resolves.toMatchObject({
      eventType: 'Corporate', location: 'Bern', dietaryRequirements: [{ type: 'vegetarian', guestCount: null }],
    })
  })
})
