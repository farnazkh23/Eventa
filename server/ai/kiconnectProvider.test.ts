import { describe, expect, it, vi } from 'vitest'
import type { GeneratedMenu } from '../schemas/menu.js'
import { KiconnectProvider } from './kiconnectProvider.js'

const event = {
  eventType: 'birthday', guestCount: 35, location: 'Zürich', date: null, time: null,
  mealType: 'dinner', serviceStyle: 'seated', budgetPerGuest: null, totalBudget: null,
  dietaryRequirements: [{ type: 'vegan', guestCount: 4 }], additionalNotes: [],
}

const validMenu: GeneratedMenu = {
  title: 'Birthday dinner',
  summary: 'A concise seated menu.',
  items: [
    {
      course: 'main', name: 'Roasted chicken', description: 'Chicken with seasonal vegetables.',
      dietaryTags: [], portion: { amount: 180, unit: 'g' },
      ingredients: [{ name: 'chicken', amountPerServing: 180, unit: 'g' }],
      servingScope: 'all_guests', dietaryAllocationType: null,
    },
    {
      course: 'main', name: 'Mushroom risotto', description: 'Plant-based risotto with herbs.',
      dietaryTags: ['vegan'], portion: { amount: 280, unit: 'g' },
      ingredients: [{ name: 'risotto rice', amountPerServing: 90, unit: 'g' }],
      servingScope: 'dietary_option', dietaryAllocationType: 'vegan',
    },
  ],
  planningAssumptions: ['4 vegan guests were specified; allocation is deferred.'],
}

function response(value: unknown): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

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

  it('allows one corrective regeneration after menu schema validation fails', async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ title: 'Incomplete' }))
      .mockResolvedValueOnce(response(validMenu))
    const provider = new KiconnectProvider('key', 'https://example.test/api/v1', 'model', { fetchImplementation })

    await expect(provider.generate({ event })).resolves.toMatchObject({ title: 'Birthday dinner' })
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    expect(String(fetchImplementation.mock.calls[1]?.[1]?.body)).toContain('correction')
  })

  it('allows one corrective regeneration after menu policy validation fails', async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({
        ...validMenu,
        planningAssumptions: ['Plan 31 standard meals and 4 vegan meals.'],
      }))
      .mockResolvedValueOnce(response(validMenu))
    const provider = new KiconnectProvider('key', 'https://example.test/api/v1', 'model', { fetchImplementation })

    await expect(provider.generate({ event })).resolves.toMatchObject({ title: 'Birthday dinner' })
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
  })

  it('corrects missing per-serving ingredient metadata before returning a menu', async () => {
    const incompleteQuantities: GeneratedMenu = {
      ...validMenu,
      items: validMenu.items.map((item, index) => index === 0 ? {
        ...item,
        ingredients: [{ name: 'chicken', amountPerServing: null, unit: null }],
      } : item),
    }
    const fetchImplementation = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response(incompleteQuantities))
      .mockResolvedValueOnce(response(validMenu))
    const provider = new KiconnectProvider('key', 'https://example.test/api/v1', 'model', { fetchImplementation })

    const menu = await provider.generate({ event })

    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    expect(menu.items.flatMap((item) => item.ingredients)).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'chicken', amountPerServing: 180, unit: 'g' }),
    ]))
  })
})
