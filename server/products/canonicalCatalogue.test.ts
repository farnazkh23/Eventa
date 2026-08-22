import { describe, expect, it } from 'vitest'
import { loadCanonicalCatalogue } from './canonicalCatalogue.js'

describe('canonical catalogue loader', () => {
  it('loads the validated canonical product union with unique articles', async () => {
    const products = await loadCanonicalCatalogue()
    expect(products).toHaveLength(392)
    expect(new Set(products.map(({ articleNumber }) => articleNumber)).size).toBe(products.length)
    expect(products.find(({ articleNumber }) => articleNumber === '152501')?.hasUnresolvedConflict).toBe(true)
  })
})
