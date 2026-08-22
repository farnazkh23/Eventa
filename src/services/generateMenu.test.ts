import { describe, expect, it, vi } from 'vitest'
import type { EventInterpretation } from '../../shared/eventInterpretation'
import { generateMenu } from './generateMenu'

const event: EventInterpretation = {
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
}

const menu = {
  title: 'Birthday dinner menu',
  summary: 'A seated dinner with a vegan main option.',
  items: [
    {
      id: 'starter-salad-123',
      course: 'starter',
      name: 'Seasonal salad',
      description: 'A light seasonal starter.',
      dietaryTags: ['vegan'],
      portion: { amount: 120, unit: 'g' },
      ingredients: [{ name: 'salad leaves', amountPerServing: 70, unit: 'g' }],
      servingScope: 'all_guests',
    },
    {
      id: 'main-chicken-456',
      course: 'main',
      name: 'Herb roasted chicken',
      description: 'Roasted chicken with herbs.',
      dietaryTags: [],
      portion: null,
      ingredients: [{ name: 'chicken', amountPerServing: null, unit: null }],
      servingScope: 'all_guests',
    },
  ],
  planningAssumptions: ['Four vegan portions will be considered during quantity planning.'],
}

describe('generateMenu frontend service', () => {
  it('posts the confirmed event and returns a validated menu', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(menu), { status: 200 }),
    )

    await expect(generateMenu(event, 'Birthday dinner for 35 guests.', fetchMock)).resolves.toEqual(menu)
    expect(fetchMock).toHaveBeenCalledWith('/api/generate-menu', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"guestCount":35'),
    }))
  })

  it('exposes a safe error for server failures', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }))
    await expect(generateMenu(event, '', fetchMock)).rejects.toThrow(
      'Eventa could not create the menu. Please try again.',
    )
  })

  it('rejects malformed successful menu data', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ title: 'Incomplete menu' }), { status: 200 }),
    )
    await expect(generateMenu(event, '', fetchMock)).rejects.toThrow(
      'Eventa received an invalid menu. Please try again.',
    )
  })

  it('exposes a safe error for network failures', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('internal socket detail'))
    await expect(generateMenu(event, '', fetchMock)).rejects.toThrow(
      'Eventa could not reach the menu service. Please try again.',
    )
  })
})
