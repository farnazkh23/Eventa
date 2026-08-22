import { describe, expect, it, vi } from 'vitest'
import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import type { AIProvider } from './aiProvider.js'
import { KiconnectApiError, KiconnectStructuredOutputError } from './kiconnect.js'
import { KiconnectFailoverProvider } from './kiconnectFailoverProvider.js'

const event: EventInterpretation = {
  eventType: null, guestCount: 20, location: null, date: null, time: null,
  mealType: null, serviceStyle: null, budgetPerGuest: null, totalBudget: null,
  dietaryRequirements: [], additionalNotes: [],
}

function providers(error: unknown) {
  const primary = { name: 'primary', interpret: vi.fn().mockRejectedValue(error), generate: vi.fn().mockRejectedValue(error) } as unknown as AIProvider
  const fallback = { name: 'fallback', interpret: vi.fn().mockResolvedValue(event), generate: vi.fn() } as unknown as AIProvider
  return { primary, fallback, provider: new KiconnectFailoverProvider(primary, fallback, 'mistral', 'gpt-oss') }
}

describe('KiconnectFailoverProvider', () => {
  it('uses GPT fallback after exhausted transient Mistral transport failure', async () => {
    const { fallback, provider } = providers(new KiconnectApiError(503, 'kiconnect_503', true))
    await expect(provider.interpret('event description')).resolves.toBe(event)
    expect(fallback.interpret).toHaveBeenCalledOnce()
  })

  it('uses GPT fallback after exhausted Mistral schema correction', async () => {
    const { fallback, provider } = providers(new KiconnectStructuredOutputError(2))
    await expect(provider.interpret('event description')).resolves.toBe(event)
    expect(fallback.interpret).toHaveBeenCalledOnce()
  })

  it('applies the same fallback policy to menu generation', async () => {
    const { fallback, provider } = providers(new KiconnectStructuredOutputError(2))
    const menu = { title: 'Fallback menu' }
    vi.mocked(fallback.generate).mockResolvedValue(menu as never)
    await expect(provider.generate({ event, originalDescription: 'Company event for 20 guests.' })).resolves.toBe(menu)
    expect(fallback.generate).toHaveBeenCalledOnce()
  })

  it('does not hide permanent authentication or request errors with fallback', async () => {
    const error = new KiconnectApiError(401, 'permanent_configuration', false)
    const { fallback, provider } = providers(error)
    await expect(provider.interpret('event description')).rejects.toBe(error)
    expect(fallback.interpret).not.toHaveBeenCalled()
  })
})
