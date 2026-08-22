import { describe, expect, it, vi } from 'vitest'
import { interpretEvent, InterpretEventServiceError } from './interpretEvent'

const validResult = {
  eventType: 'corporate event',
  guestCount: 120,
  location: 'Bern',
  date: null,
  time: null,
  mealType: null,
  serviceStyle: 'buffet',
  budgetPerGuest: 45,
  totalBudget: null,
  dietaryRequirements: [{ type: 'vegetarian', guestCount: null }],
  additionalNotes: [],
}

describe('interpretEvent', () => {
  it('returns a validated API result', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(validResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(interpretEvent('Company event for 120 people', fetchMock)).resolves.toEqual(validResult)
    expect(fetchMock).toHaveBeenCalledWith('/api/interpret-event', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('normalizes legacy dietary string responses for backwards compatibility', async () => {
    const legacyResult = { ...validResult, dietaryRequirements: ['vegetarian'] }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(legacyResult), { status: 200 }),
    )

    await expect(interpretEvent('Company event for 120 people', fetchMock)).resolves.toEqual({
      ...validResult,
      dietaryRequirements: [{ type: 'vegetarian', guestCount: null }],
    })
  })

  it('converts server failures into a safe service error', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'AI_UNAVAILABLE' } }), { status: 503 }),
    )

    await expect(interpretEvent('Birthday dinner for 35 guests', fetchMock)).rejects.toEqual(
      expect.objectContaining<Partial<InterpretEventServiceError>>({
        name: 'InterpretEventServiceError',
        message: 'Eventa’s AI service is unavailable. Please try again.',
      }),
    )
  })

  it('rejects malformed successful responses instead of displaying fake data', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ eventType: 'birthday' }), { status: 200 }),
    )

    await expect(interpretEvent('Birthday dinner for 35 guests', fetchMock)).rejects.toThrow(
      'Eventa received an invalid response. Please try again.',
    )
  })

  it('converts network failures into a safe service error', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('socket details'))

    await expect(interpretEvent('Planning an event for around 80 people', fetchMock)).rejects.toThrow(
      'Eventa could not reach the AI service. Please try again.',
    )
  })
})
