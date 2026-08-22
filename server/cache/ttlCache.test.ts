import { describe, expect, it, vi } from 'vitest'
import { TtlCache } from './ttlCache.js'

describe('TtlCache', () => {
  it('expires entries and evicts the least recently used entry', () => {
    vi.useFakeTimers()
    const cache = new TtlCache<number>(2, 100)
    cache.set('a', 1); cache.set('b', 2); expect(cache.get('a')).toBe(1)
    cache.set('c', 3)
    expect(cache.get('b')).toBeUndefined()
    vi.advanceTimersByTime(101)
    expect(cache.get('a')).toBeUndefined()
    vi.useRealTimers()
  })
})
