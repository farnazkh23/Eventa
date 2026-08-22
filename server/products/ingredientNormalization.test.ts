import { describe, expect, it } from 'vitest'
import { inferProductTaxonomy, normalizeIngredientForMatching } from './ingredientNormalization.js'

describe('ingredient normalization', () => {
  it('folds punctuation, accents, whitespace, and known multilingual aliases', () => {
    expect(normalizeIngredientForMatching('  Frische Hühner-Brust  ')).toBe('chicken breast')
    expect(normalizeIngredientForMatching('Tomaten')).toBe('tomato')
    expect(normalizeIngredientForMatching('Mixed greens')).toBe('salad')
    expect(normalizeIngredientForMatching('Heidelbeeren')).toBe('blueberry')
  })

  it('infers only deterministic taxonomy hints', () => {
    expect(inferProductTaxonomy('chicken breast')).toEqual({ category: 'meat_poultry', subcategory: 'chicken' })
    expect(inferProductTaxonomy('sumac')).toEqual({})
    expect(inferProductTaxonomy('broccoli')).toEqual({ category: 'vegetables_fruit', subcategory: 'broccoli' })
  })
})
