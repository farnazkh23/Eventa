import type { CanonicalProduct, IngredientProductMatch } from '../../shared/productMatching.js'
import type { CreatePurchasingPlanRequest, PackCalculation, PurchasingPlan, ShoppingCategory, ShoppingListLine } from '../../shared/purchasing.js'
import { roundQuantity, toCanonicalQuantity } from '../quantities/unitConversion.js'

const categoryOrder: ShoppingCategory[] = ['meat_fish', 'vegetables_fruit', 'dairy', 'pantry_grains', 'sauces', 'bakery', 'drinks', 'plant_based', 'desserts', 'review']

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function shoppingCategory(product: CanonicalProduct | null): ShoppingCategory {
  if (!product) return 'review'
  const categories: Record<string, ShoppingCategory> = {
    meat_poultry: 'meat_fish', fish_seafood: 'meat_fish', vegetables_fruit: 'vegetables_fruit',
    dairy_eggs: 'dairy', rice_pasta_grains: 'pantry_grains', sauces_condiments: 'sauces',
    bread_bakery: 'bakery', non_alcoholic_drinks: 'drinks', plant_based: 'plant_based',
    dessert_ingredients: 'desserts',
  }
  return categories[product.category] ?? 'review'
}

function labelledCaseAmount(product: CanonicalProduct, canonicalUnit: 'g' | 'ml' | 'piece'): number | null {
  if (!product.unitsPerSalesUnit || product.unitsPerSalesUnit <= 1 || canonicalUnit === 'piece') return null
  const match = product.name.match(/\b(\d+)\s*(?:fl\.?\s*)?x\s*(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)\b/i)
  if (!match) return null
  const count = Number(match[1])
  const amount = Number(match[2]?.replace(',', '.'))
  const unit = match[3]?.toLocaleLowerCase('en')
  if (!Number.isFinite(count) || !Number.isFinite(amount) || count !== product.unitsPerSalesUnit || !unit) return null
  const normalized = unit === 'cl'
    ? { amount: amount * 10, unit: 'ml' as const }
    : toCanonicalQuantity(amount, unit)
  if (!normalized || normalized.unit !== canonicalUnit) return null
  return roundQuantity(normalized.amount * count)
}

function calculatePack(match: IngredientProductMatch): { pack: PackCalculation | null; reason?: string } {
  const product = match.selectedProduct
  if (!product) return { pack: null, reason: 'No safely selected Transgourmet product.' }
  if (product.hasUnresolvedConflict) return { pack: null, reason: 'Selected product has unresolved catalogue metadata conflicts.' }
  if (product.packSizeValue === null || product.packSizeUnit === null) return { pack: null, reason: 'Selected product has no validated pack size.' }
  const canonical = toCanonicalQuantity(product.packSizeValue, product.packSizeUnit)
  if (!canonical) return { pack: null, reason: `Unsupported product pack unit "${product.packSizeUnit}".` }
  if (canonical.unit !== match.requiredUnit) return { pack: null, reason: `Required unit ${match.requiredUnit} is incompatible with product pack unit ${product.packSizeUnit}.` }
  const labelledTotal = labelledCaseAmount(product, canonical.unit)
  const canonicalPackAmount = labelledTotal !== null
    && Math.abs(canonical.amount - labelledTotal) > 0.01
    ? labelledTotal
    : canonical.amount
  const recommendedPacks = Math.ceil(match.requiredAmount / canonicalPackAmount)
  const recommendedPurchaseAmount = roundQuantity(recommendedPacks * canonicalPackAmount)
  return {
    pack: {
      packSize: product.packSizeValue,
      packUnit: product.packSizeUnit,
      unitsPerSalesUnit: product.unitsPerSalesUnit,
      canonicalPackAmount,
      canonicalUnit: canonical.unit,
      recommendedPacks,
      recommendedPurchaseAmount,
      surplusAmount: roundQuantity(recommendedPurchaseAmount - match.requiredAmount),
    },
  }
}

function calculateLineTotal(product: CanonicalProduct, pack: PackCalculation): number | null {
  if (product.priceCHF === null || product.priceBasis === null) return null
  if (product.priceBasis === 'per_pack') return roundMoney(pack.recommendedPacks * product.priceCHF)
  if (product.priceBasis === 'per_kg' && pack.canonicalUnit === 'g') return roundMoney(pack.recommendedPurchaseAmount / 1000 * product.priceCHF)
  if (product.priceBasis === 'per_liter' && pack.canonicalUnit === 'ml') return roundMoney(pack.recommendedPurchaseAmount / 1000 * product.priceCHF)
  if (product.priceBasis === 'per_piece') {
    const pieces = pack.canonicalUnit === 'piece'
      ? pack.recommendedPurchaseAmount
      : product.unitsPerSalesUnit === null ? null : pack.recommendedPacks * product.unitsPerSalesUnit
    return pieces === null ? null : roundMoney(pieces * product.priceCHF)
  }
  return null
}

function createLine(match: IngredientProductMatch, alreadyInStock: boolean): ShoppingListLine {
  const product = match.selectedProduct
  const base = {
    ingredientKey: match.ingredientKey, ingredientName: match.ingredientName,
    requiredAmount: match.requiredAmount, requiredUnit: match.requiredUnit,
    sourceMenuItemIds: [...match.sourceMenuItemIds], matchStatus: match.status,
    selectedProduct: product, category: shoppingCategory(product), alreadyInStock,
  }
  if (match.status !== 'matched' || !product) {
    return {
      ...base, pack: null, packsToBuy: null, purchaseAmount: null, purchaseUnit: null,
      surplusAmount: null, knownPriceCHF: null, priceBasis: null, lineTotalCHF: null,
      status: match.status === 'low_confidence' ? 'needs_confirmation' : 'unresolved',
      reason: match.reason,
    }
  }
  const calculation = calculatePack(match)
  if (!calculation.pack) {
    return {
      ...base, pack: null, packsToBuy: null, purchaseAmount: null, purchaseUnit: null,
      surplusAmount: null, knownPriceCHF: product.priceCHF, priceBasis: product.priceBasis,
      lineTotalCHF: null, status: 'needs_confirmation', reason: calculation.reason ?? 'Pack calculation requires confirmation.',
    }
  }
  const variableWeight = product.priceBasis === 'per_kg'
    && /\b(?:ca\.?|approx(?:\.|imately)?|variable)[\s,]/i.test(product.name)
  const lineTotal = variableWeight ? null : calculateLineTotal(product, calculation.pack)
  if (alreadyInStock) {
    return {
      ...base, pack: calculation.pack, packsToBuy: 0, purchaseAmount: 0,
      purchaseUnit: calculation.pack.canonicalUnit, surplusAmount: null,
      knownPriceCHF: product.priceCHF, priceBasis: product.priceBasis, lineTotalCHF: 0,
      status: 'ready', reason: 'Already available; excluded from purchasing and budget.',
    }
  }
  return {
    ...base, pack: calculation.pack, packsToBuy: calculation.pack.recommendedPacks,
    purchaseAmount: calculation.pack.recommendedPurchaseAmount,
    purchaseUnit: calculation.pack.canonicalUnit, surplusAmount: calculation.pack.surplusAmount,
    knownPriceCHF: product.priceCHF, priceBasis: product.priceBasis, lineTotalCHF: lineTotal,
    status: lineTotal === null ? 'unpriced' : 'ready',
    reason: lineTotal === null
      ? variableWeight
        ? 'Pack recommendation uses the catalogue nominal weight; variable-weight price requires confirmation.'
        : 'Pack quantity is calculated, but no compatible verified price and price basis are available.'
      : 'Product, pack quantity, and known price calculated deterministically.',
  }
}

export function createPurchasingPlan(input: CreatePurchasingPlanRequest): PurchasingPlan {
  const stock = new Map((input.stockOverrides ?? []).map(({ ingredientKey, alreadyInStock }) => [ingredientKey, alreadyInStock]))
  const lines = input.productMatches.matches.map((match) => createLine(match, stock.get(match.ingredientKey) === true))
  const knownSubtotalCHF = roundMoney(lines.reduce((total, line) => total + (line.lineTotalCHF ?? 0), 0))
  const unresolvedLineCount = lines.filter(({ status }) => status === 'unresolved' || status === 'needs_confirmation').length
  const unpricedLineCount = lines.filter(({ status }) => status === 'unpriced').length
  const pricedLineCount = lines.filter((line) => line.lineTotalCHF !== null && !line.alreadyInStock).length
  const alreadyInStockLineCount = lines.filter(({ alreadyInStock }) => alreadyInStock).length
  const costPerGuest = roundMoney(knownSubtotalCHF / input.event.guestCount)
  const groups = categoryOrder
    .map((category) => ({ category, lines: lines.filter((line) => line.category === category) }))
    .filter(({ lines: groupLines }) => groupLines.length > 0)

  return {
    lines,
    groups,
    budget: {
      knownSubtotalCHF,
      pricedLineCount,
      unpricedLineCount,
      unresolvedLineCount,
      alreadyInStockLineCount,
      costPerGuestFromKnownPricesCHF: costPerGuest,
      budgetPerGuestTargetCHF: input.event.budgetPerGuest,
      totalBudgetTargetCHF: input.event.totalBudget,
      differenceFromPerGuestTargetCHF: input.event.budgetPerGuest === null
        ? null : roundMoney(costPerGuest - input.event.budgetPerGuest),
      differenceFromTotalTargetCHF: input.event.totalBudget === null
        ? null : roundMoney(knownSubtotalCHF - input.event.totalBudget),
      isComplete: unresolvedLineCount === 0 && unpricedLineCount === 0,
    },
    summary: {
      totalLines: lines.length,
      ready: lines.filter(({ status }) => status === 'ready').length,
      needsConfirmation: lines.filter(({ status }) => status === 'needs_confirmation').length,
      unresolved: lines.filter(({ status }) => status === 'unresolved').length,
      unpriced: unpricedLineCount,
      alreadyInStock: alreadyInStockLineCount,
    },
    assumptions: [
      'Pack counts use the ceiling of required quantity divided by validated compatible pack size.',
      'No catering buffer, density conversion, product price, or missing pack metadata is invented.',
      'Known budget subtotal includes only priced products that are not marked already in stock.',
      'Total budget is never derived from the per-guest budget.',
    ],
  }
}
