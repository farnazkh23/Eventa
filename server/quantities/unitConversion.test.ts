import { describe, expect, it } from 'vitest'
import { roundQuantity, toCanonicalQuantity } from './unitConversion.js'

describe('toCanonicalQuantity', () => {
  it.each([
    [2, 'kg', { amount: 2000, unit: 'g' }],
    [250, 'g', { amount: 250, unit: 'g' }],
    [1.5, 'l', { amount: 1500, unit: 'ml' }],
    [330, 'ml', { amount: 330, unit: 'ml' }],
    [3, 'piece', { amount: 3, unit: 'piece' }],
    [4, 'pcs', { amount: 4, unit: 'piece' }],
  ] as const)('converts %s %s to its canonical unit', (amount, unit, expected) => {
    expect(toCanonicalQuantity(amount, unit)).toEqual(expected)
  })

  it('rejects unsupported units instead of converting dimensions', () => {
    expect(toCanonicalQuantity(1, 'tablespoon')).toBeNull()
  })

  it('removes floating-point noise without discarding meaningful precision', () => {
    expect(roundQuantity(0.1 * 3)).toBe(0.3)
    expect(roundQuantity(1.23456749)).toBe(1.234567)
  })
})
