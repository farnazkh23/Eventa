import { describe, expect, it, vi } from 'vitest'
import type { AIProvider } from './aiProvider.js'
import { CachedDeduplicatingAIProvider } from './aiProvider.js'

const interpretation = { eventType: null, guestCount: 20, location: null, date: null, time: null, mealType: null, serviceStyle: null, budgetPerGuest: null, totalBudget: null, dietaryRequirements: [], additionalNotes: [] }

describe('CachedDeduplicatingAIProvider', () => {
  it('shares identical in-flight work and caches successful results', async () => {
    let resolve!: (value: typeof interpretation) => void
    const pending = new Promise<typeof interpretation>((done) => { resolve = done })
    const interpret = vi.fn(() => pending)
    const provider = { name: 'test', interpret, generate: vi.fn() } as unknown as AIProvider
    const wrapped = new CachedDeduplicatingAIProvider(provider, { enabled: true, ttlMs: 1000, maxEntries: 5 })
    const first = wrapped.interpret(' Same event ')
    const second = wrapped.interpret('Same event')
    expect(interpret).toHaveBeenCalledTimes(1)
    resolve(interpretation)
    await expect(Promise.all([first, second])).resolves.toEqual([interpretation, interpretation])
    await expect(wrapped.interpret('Same event')).resolves.toEqual(interpretation)
    expect(interpret).toHaveBeenCalledTimes(1)
  })

  it('does not cache failures', async () => {
    const interpret = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce(interpretation)
    const provider = { name: 'test', interpret, generate: vi.fn() } as unknown as AIProvider
    const wrapped = new CachedDeduplicatingAIProvider(provider, { enabled: true, ttlMs: 1000, maxEntries: 5 })
    await expect(wrapped.interpret('event')).rejects.toThrow('fail')
    await expect(wrapped.interpret('event')).resolves.toEqual(interpretation)
    expect(interpret).toHaveBeenCalledTimes(2)
  })
})
