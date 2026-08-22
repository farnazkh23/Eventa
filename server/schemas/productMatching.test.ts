import { describe, expect, it } from 'vitest'
import { matchProductsRequestSchema } from './productMatching.js'

describe('match products request schema', () => {
  it('accepts ingredient inputs and optional taxonomy hints', () => {
    expect(matchProductsRequestSchema.safeParse({ ingredients: [{
      ingredientKey: 'rice:g', name: 'risotto rice', amount: 9000, unit: 'g',
      sourceMenuItemIds: ['risotto'], categoryHint: 'rice_pasta_grains',
    }] }).success).toBe(true)
  })

  it('rejects empty, unknown, and malformed input', () => {
    expect(matchProductsRequestSchema.safeParse({ ingredients: [] }).success).toBe(false)
    expect(matchProductsRequestSchema.safeParse({ ingredients: [{ ingredientKey: '', name: '' }] }).success).toBe(false)
    expect(matchProductsRequestSchema.safeParse({ ingredients: [{
      ingredientKey: 'x', name: 'x', amount: 1, unit: 'g', sourceMenuItemIds: ['item'], extra: true,
    }] }).success).toBe(false)
    expect(matchProductsRequestSchema.safeParse({ ingredients: [{
      ingredientKey: 'x', name: 'x', amount: 1, unit: 'kg', sourceMenuItemIds: ['item'],
    }] }).success).toBe(false)
  })
})
