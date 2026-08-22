import { describe, expect, it } from 'vitest'
import type { QuantityEvent } from '../../shared/quantities.js'
import type { CanonicalProduct, IngredientProductMatch, ProductMatchPlan } from '../../shared/productMatching.js'
import { createPurchasingPlan } from './purchasingEngine.js'

const event: QuantityEvent = {
  eventType: 'corporate', guestCount: 10, location: null, date: null, time: null,
  mealType: null, serviceStyle: null, budgetPerGuest: 45, totalBudget: null,
  dietaryRequirements: [], additionalNotes: [],
}

function product(overrides: Partial<CanonicalProduct> = {}): CanonicalProduct {
  return {
    articleNumber: '234790', name: 'Risotto rice 5 kg', brand: null,
    category: 'rice_pasta_grains', subcategory: 'rice_risotto',
    packSizeValue: 5, packSizeUnit: 'kg', salesUnit: 'bag', unitsPerSalesUnit: 1,
    priceCHF: 10, priceBasis: 'per_pack', sourceUrl: null,
    verificationStatus: 'verified_public_source', hasUnresolvedConflict: false,
    ...overrides,
  }
}

function match(overrides: Partial<IngredientProductMatch> = {}): IngredientProductMatch {
  return {
    ingredientKey: 'rice:g', ingredientName: 'rice', normalizedIngredientName: 'rice',
    requiredAmount: 7200, requiredUnit: 'g', sourceMenuItemIds: ['main'], status: 'matched',
    selectedProduct: product(), score: 90, reason: 'Exact match.', alternatives: [], ...overrides,
  }
}

function matches(...items: IngredientProductMatch[]): ProductMatchPlan {
  return {
    matches: items,
    summary: {
      totalIngredients: items.length,
      matched: items.filter(({ status }) => status === 'matched').length,
      lowConfidence: items.filter(({ status }) => status === 'low_confidence').length,
      unresolved: items.filter(({ status }) => status === 'unresolved').length,
      selectedProductsWithPrice: items.filter(({ selectedProduct }) => selectedProduct?.priceCHF !== null && selectedProduct !== null).length,
    },
  }
}

describe('deterministic purchasing engine', () => {
  it('calculates packs, purchase amount, surplus, and per-pack price', () => {
    const plan = createPurchasingPlan({ event, productMatches: matches(match()) })
    expect(plan.lines[0]).toMatchObject({
      packsToBuy: 2, purchaseAmount: 10_000, purchaseUnit: 'g', surplusAmount: 2800,
      knownPriceCHF: 10, priceBasis: 'per_pack', lineTotalCHF: 20, status: 'ready',
      pack: { canonicalPackAmount: 5000, recommendedPacks: 2 },
    })
    expect(plan.budget).toMatchObject({
      knownSubtotalCHF: 20, costPerGuestFromKnownPricesCHF: 2,
      budgetPerGuestTargetCHF: 45, totalBudgetTargetCHF: null,
      differenceFromPerGuestTargetCHF: -43, differenceFromTotalTargetCHF: null,
    })
  })

  it('prices per-kg products from purchased mass', () => {
    const plan = createPurchasingPlan({ event, productMatches: matches(match({
      requiredAmount: 2400,
      selectedProduct: product({ packSizeValue: 3, priceCHF: 8.4, priceBasis: 'per_kg' }),
    })) })
    expect(plan.lines[0]).toMatchObject({ packsToBuy: 1, purchaseAmount: 3000, lineTotalCHF: 25.2 })
  })

  it('prices per-piece and per-liter products in compatible dimensions', () => {
    const pieceLine = match({
      ingredientKey: 'cucumber:piece', ingredientName: 'cucumber', requiredAmount: 9, requiredUnit: 'piece',
      selectedProduct: product({ articleNumber: '042020', packSizeValue: 4, packSizeUnit: 'piece', unitsPerSalesUnit: 4, priceCHF: 1.75, priceBasis: 'per_piece' }),
    })
    const literLine = match({
      ingredientKey: 'drink:ml', ingredientName: 'drink', requiredAmount: 7200, requiredUnit: 'ml',
      selectedProduct: product({ articleNumber: '621510', packSizeValue: 5, packSizeUnit: 'l', priceCHF: 2, priceBasis: 'per_liter' }),
    })
    const plan = createPurchasingPlan({ event, productMatches: matches(pieceLine, literLine) })
    expect(plan.lines[0]).toMatchObject({ packsToBuy: 3, purchaseAmount: 12, lineTotalCHF: 21 })
    expect(plan.lines[1]).toMatchObject({ packsToBuy: 2, purchaseAmount: 10_000, lineTotalCHF: 20 })
  })

  it('uses explicit multi-unit label evidence for case pack amount and per-piece pricing', () => {
    const caseMatch = match({
      ingredientKey: 'water:ml', ingredientName: 'sparkling water', requiredAmount: 13_000, requiredUnit: 'ml',
      selectedProduct: product({
        articleNumber: '626970', name: 'Aquina mit CO2, Pack zu 24 Fl. x 50 cl',
        category: 'non_alcoholic_drinks', packSizeValue: 500, packSizeUnit: 'ml',
        unitsPerSalesUnit: 24, priceCHF: 0.46, priceBasis: 'per_piece',
      }),
    })
    const line = createPurchasingPlan({ event, productMatches: matches(caseMatch) }).lines[0]
    expect(line).toMatchObject({
      packsToBuy: 2, purchaseAmount: 24_000, surplusAmount: 11_000,
      lineTotalCHF: 22.08, pack: { canonicalPackAmount: 12_000 },
    })
  })

  it('does not present a variable-weight per-kg line total as confirmed', () => {
    const variable = match({ selectedProduct: product({ name: 'Beef, ca. 5 kg', priceCHF: 20, priceBasis: 'per_kg' }) })
    const line = createPurchasingPlan({ event, productMatches: matches(variable) }).lines[0]
    expect(line).toMatchObject({ status: 'unpriced', lineTotalCHF: null })
    expect(line.reason).toContain('variable-weight')
  })

  it('keeps incompatible or missing pack metadata as needs_confirmation', () => {
    const incompatible = match({
      ingredientKey: 'cucumber:g', ingredientName: 'cucumber', requiredAmount: 3600,
      selectedProduct: product({ packSizeValue: 4, packSizeUnit: 'piece' }),
    })
    const missing = match({
      ingredientKey: 'herb:g', ingredientName: 'herb', selectedProduct: product({ packSizeValue: null, packSizeUnit: null }),
    })
    const plan = createPurchasingPlan({ event, productMatches: matches(incompatible, missing) })
    expect(plan.lines.map(({ status }) => status)).toEqual(['needs_confirmation', 'needs_confirmation'])
    expect(plan.budget.unresolvedLineCount).toBe(2)
  })

  it('returns a partial budget when a calculated pack has no usable price', () => {
    const priced = match()
    const unpriced = match({
      ingredientKey: 'potato:g', ingredientName: 'potato',
      selectedProduct: product({ articleNumber: '040110', priceCHF: null, priceBasis: null }),
    })
    const plan = createPurchasingPlan({ event, productMatches: matches(priced, unpriced) })
    expect(plan.budget).toMatchObject({ knownSubtotalCHF: 20, pricedLineCount: 1, unpricedLineCount: 1, isComplete: false })
    expect(plan.lines[1].status).toBe('unpriced')
  })

  it('keeps low-confidence and unresolved matches visible without selecting them', () => {
    const low = match({ status: 'low_confidence', selectedProduct: null, reason: 'Confirm candidate.' })
    const unresolved = match({ ingredientKey: 'sumac:g', ingredientName: 'sumac', status: 'unresolved', selectedProduct: null })
    const plan = createPurchasingPlan({ event, productMatches: matches(low, unresolved) })
    expect(plan.lines.map(({ status }) => status)).toEqual(['needs_confirmation', 'unresolved'])
    expect(plan.groups).toEqual([expect.objectContaining({ category: 'review' })])
  })

  it('keeps already-in-stock products visible while excluding them from purchase and budget', () => {
    const plan = createPurchasingPlan({
      event,
      productMatches: matches(match()),
      stockOverrides: [{ ingredientKey: 'rice:g', alreadyInStock: true }],
    })
    expect(plan.lines[0]).toMatchObject({ alreadyInStock: true, packsToBuy: 0, purchaseAmount: 0, lineTotalCHF: 0 })
    expect(plan.budget).toMatchObject({ knownSubtotalCHF: 0, pricedLineCount: 0, alreadyInStockLineCount: 1 })
  })

  it('does not treat unsupported price basis text as a pack price', () => {
    const plan = createPurchasingPlan({ event, productMatches: matches(match({
      selectedProduct: product({ priceCHF: 23.18, priceBasis: '2 x 1.5 kg' }),
    })) })
    expect(plan.lines[0]).toMatchObject({ status: 'unpriced', lineTotalCHF: null })
  })
})
