import { describe, expect, it } from 'vitest'
import { createPurchasingPlanRequestSchema } from './purchasing.js'

const event = {
  eventType: null, guestCount: 10, location: null, date: null, time: null, mealType: null,
  serviceStyle: null, budgetPerGuest: null, totalBudget: null, dietaryRequirements: [], additionalNotes: [],
}
const productMatches = {
  matches: [{
    ingredientKey: 'rice:g', ingredientName: 'rice', normalizedIngredientName: 'rice',
    requiredAmount: 1000, requiredUnit: 'g', sourceMenuItemIds: ['main'], status: 'unresolved',
    selectedProduct: null, score: 0, reason: 'No safe match.', alternatives: [],
  }],
  summary: { totalIngredients: 1, matched: 0, lowConfidence: 0, unresolved: 1, selectedProductsWithPrice: 0 },
}

describe('purchasing request schema', () => {
  it('accepts product matches and explicit stock state', () => {
    expect(createPurchasingPlanRequestSchema.safeParse({
      event, productMatches, stockOverrides: [{ ingredientKey: 'rice:g', alreadyInStock: true }],
    }).success).toBe(true)
  })

  it('rejects duplicate or unknown stock overrides', () => {
    expect(createPurchasingPlanRequestSchema.safeParse({
      event, productMatches, stockOverrides: [
        { ingredientKey: 'rice:g', alreadyInStock: true },
        { ingredientKey: 'rice:g', alreadyInStock: false },
      ],
    }).success).toBe(false)
    expect(createPurchasingPlanRequestSchema.safeParse({
      event, productMatches, stockOverrides: [{ ingredientKey: 'unknown:g', alreadyInStock: true }],
    }).success).toBe(false)
  })
})
