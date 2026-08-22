import { describe, expect, it } from 'vitest'
import type { CanonicalProduct } from '../../shared/productMatching.js'
import { matchProducts } from './productMatcher.js'

function product(overrides: Partial<CanonicalProduct> & Pick<CanonicalProduct, 'articleNumber' | 'name'>): CanonicalProduct {
  return {
    brand: null, category: 'vegetables_fruit', subcategory: null,
    packSizeValue: 1, packSizeUnit: 'kg', salesUnit: 'package', unitsPerSalesUnit: 1,
    priceCHF: null, priceBasis: null, sourceUrl: null, verificationStatus: 'seed_unverified',
    hasUnresolvedConflict: false, ...overrides,
  }
}

const catalogue = [
  product({ articleNumber: '000001', name: 'Poulet Brust frisch', category: 'meat_poultry', subcategory: 'chicken', verificationStatus: 'verified_public_source' }),
  product({ articleNumber: '000002', name: 'Poulet Schenkel', category: 'meat_poultry', subcategory: 'chicken', priceCHF: 12 }),
  product({ articleNumber: '000003', name: 'Tomaten gehackt', subcategory: 'tomatoes', priceCHF: 4 }),
]

function ingredient(name: string, ingredientKey = `${name}:g`) {
  return { ingredientKey, name, amount: 1000, unit: 'g' as const, sourceMenuItemIds: ['menu-item'] }
}

describe('product matcher', () => {
  it('matches multilingual normalized names deterministically', () => {
    const input = [ingredient('chicken breast', 'chicken:g')]
    expect(matchProducts(input, catalogue)).toEqual(matchProducts(input, catalogue))
    expect(matchProducts(input, catalogue).matches[0]).toMatchObject({
      status: 'matched', selectedProduct: { articleNumber: '000001' },
    })
  })

  it('uses verification and price as tie-break signals', () => {
    const products = [
      product({ articleNumber: '000010', name: 'Tomaten', subcategory: 'tomatoes' }),
      product({ articleNumber: '000011', name: 'Tomaten', subcategory: 'tomatoes', verificationStatus: 'verified_public_source', priceCHF: 3 }),
    ]
    expect(matchProducts([ingredient('tomato', 'tomato:g')], products).matches[0].selectedProduct?.articleNumber).toBe('000011')
  })

  it('down-ranks unresolved catalogue conflicts', () => {
    const products = [
      product({ articleNumber: '000020', name: 'Butter', category: 'dairy_eggs', subcategory: 'butter', hasUnresolvedConflict: true }),
      product({ articleNumber: '000021', name: 'Butter mild', category: 'dairy_eggs', subcategory: 'butter' }),
    ]
    expect(matchProducts([ingredient('butter', 'butter:g')], products).matches[0].selectedProduct?.articleNumber).toBe('000021')
  })

  it('does not invent a match without meaningful lexical evidence', () => {
    const result = matchProducts([ingredient('sumac', 'sumac:g')], catalogue).matches[0]
    expect(result.status).toBe('unresolved')
    expect(result.selectedProduct).toBeNull()
  })

  it('returns low confidence and ranked alternatives for partial evidence', () => {
    const result = matchProducts([ingredient('chicken', 'chicken:g')], catalogue).matches[0]
    expect(['matched', 'low_confidence']).toContain(result.status)
    expect(result.alternatives.length).toBeGreaterThan(0)
    if (result.status === 'low_confidence') expect(result.selectedProduct).toBeNull()
    expect(result.reason).toContain('Poulet')
  })

  it('preserves the deterministic required quantity in every match result', () => {
    expect(matchProducts([ingredient('chicken breast', 'chicken:g')], catalogue).matches[0]).toMatchObject({
      requiredAmount: 1000,
      requiredUnit: 'g',
      sourceMenuItemIds: ['menu-item'],
    })
  })
})
