import { describe, expect, it, vi } from 'vitest'
import type { EventInterpretation } from '../../shared/eventInterpretation'
import { MenuPrefetch } from './menuPrefetch'

const event: EventInterpretation = {
  eventType: 'birthday',
  guestCount: 35,
  location: 'Zürich',
  date: null,
  time: null,
  mealType: 'dinner',
  serviceStyle: 'seated',
  budgetPerGuest: null,
  totalBudget: null,
  dietaryRequirements: [{ type: 'vegan', guestCount: 4 }],
  additionalNotes: [],
}

const menu = {
  title: 'Birthday dinner',
  summary: 'A seated seasonal dinner.',
  items: [
    {
      id: 'starter', course: 'starter', name: 'Salad', description: 'Seasonal salad.',
      dietaryTags: ['vegan'], portion: { amount: 120, unit: 'g' },
      ingredients: [{ name: 'lettuce', amountPerServing: 80, unit: 'g' }],
      servingScope: 'all_guests', dietaryAllocationType: null,
    },
    {
      id: 'main', course: 'main', name: 'Risotto', description: 'Mushroom risotto.',
      dietaryTags: ['vegetarian'], portion: { amount: 280, unit: 'g' },
      ingredients: [{ name: 'rice', amountPerServing: 90, unit: 'g' }],
      servingScope: 'all_guests', dietaryAllocationType: null,
    },
  ],
  planningAssumptions: [],
}

function successfulFetch() {
  return vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify(menu), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))
}

describe('MenuPrefetch', () => {
  it('shares the exact in-flight and completed request with confirmation', async () => {
    const fetchImplementation = successfulFetch()
    const prefetch = new MenuPrefetch(fetchImplementation)

    const background = prefetch.request(event, 'Birthday dinner for 35 guests.')
    const confirmed = prefetch.request(event, '  Birthday dinner for 35 guests.  ')

    expect(confirmed).toBe(background)
    await expect(confirmed).resolves.toMatchObject({ title: 'Birthday dinner' })
    expect(fetchImplementation).toHaveBeenCalledOnce()
  })

  it('does not reuse a stale menu after a relevant event edit', async () => {
    const fetchImplementation = successfulFetch()
    const prefetch = new MenuPrefetch(fetchImplementation)

    await prefetch.request(event, 'Birthday dinner for 35 guests.')
    await prefetch.request({ ...event, guestCount: 40 }, 'Birthday dinner for 35 guests.')

    expect(fetchImplementation).toHaveBeenCalledTimes(2)
  })

  it('removes a failed prefetch so confirmation can retry', async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(JSON.stringify(menu), { status: 200 }))
    const prefetch = new MenuPrefetch(fetchImplementation)

    await expect(prefetch.request(event, 'Birthday dinner for 35 guests.')).rejects.toThrow()
    await expect(prefetch.request(event, 'Birthday dinner for 35 guests.')).resolves.toMatchObject({
      title: 'Birthday dinner',
    })
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
  })
})
