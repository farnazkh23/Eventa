import type { CanonicalProduct, IngredientProductMatch, ProductCandidate, ProductMatchIngredient, ProductMatchPlan } from '../../shared/productMatching.js'
import { inferProductTaxonomy, ingredientTokens, normalizeIngredientForMatching } from './ingredientNormalization.js'

const verifiedStatuses = new Set(['verified_public_source', 'official_product_verified_price_unverified'])

function overlap(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0
  const rightSet = new Set(right)
  return left.filter((token) => rightSet.has(token)).length / new Set([...left, ...right]).size
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value}  `
  return new Set(Array.from({ length: Math.max(0, padded.length - 2) }, (_, index) => padded.slice(index, index + 3)))
}

function dice(left: string, right: string): number {
  const a = trigrams(left); const b = trigrams(right)
  if (a.size === 0 || b.size === 0) return 0
  let common = 0
  for (const value of a) if (b.has(value)) common += 1
  return (2 * common) / (a.size + b.size)
}

interface ScoredCandidate extends ProductCandidate { lexicalEvidence: number; queryCoverage: number }

function scoreCandidate(ingredient: ProductMatchIngredient, product: CanonicalProduct): ScoredCandidate {
  const ingredientName = normalizeIngredientForMatching(ingredient.name)
  const productName = normalizeIngredientForMatching(`${product.brand ?? ''} ${product.name}`)
  const ingredientWords = ingredientTokens(ingredient.name)
  const productWords = ingredientTokens(`${product.brand ?? ''} ${product.name}`)
  const keywordOverlap = overlap(ingredientWords, productWords)
  const productWordSet = new Set(productWords)
  const queryCoverage = ingredientWords.length ? ingredientWords.filter((word) => productWordSet.has(word)).length / ingredientWords.length : 0
  const nameSimilarity = Math.max(dice(ingredientName, productName), keywordOverlap, queryCoverage * 0.85)
  const exact = ingredientName === productName
  const inferred = inferProductTaxonomy(ingredient.name)
  const category = ingredient.categoryHint ?? inferred.category
  const subcategory = ingredient.subcategoryHint ?? inferred.subcategory
  let score = exact ? 60 : nameSimilarity * 55
  const reasons: string[] = []
  if (exact) reasons.push('exact normalized name')
  else if (nameSimilarity >= 0.45) reasons.push('strong normalized name similarity')
  else if (nameSimilarity >= 0.2) reasons.push('partial normalized name similarity')
  if (subcategory && product.subcategory === subcategory) { score += 14; reasons.push(`subcategory ${subcategory}`) }
  if (category && product.category === category) { score += 9; reasons.push(`category ${category}`) }
  if (keywordOverlap > 0) { score += keywordOverlap * 15; reasons.push('shared keywords') }
  if (verifiedStatuses.has(product.verificationStatus)) { score += 4; reasons.push('officially verified') }
  if (product.priceCHF !== null) { score += 2; reasons.push('price available') }
  if (product.hasUnresolvedConflict) { score -= 35; reasons.push('unresolved catalogue conflict') }
  return {
    product,
    score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)),
    lexicalEvidence: nameSimilarity,
    queryCoverage,
    reason: reasons.length ? reasons.join('; ') : 'No meaningful matching evidence.',
  }
}

function matchIngredient(ingredient: ProductMatchIngredient, products: CanonicalProduct[]): IngredientProductMatch {
  const ranked = products.map((product) => scoreCandidate(ingredient, product)).sort((left, right) =>
    right.score - left.score || right.lexicalEvidence - left.lexicalEvidence || left.product.articleNumber.localeCompare(right.product.articleNumber))
  const best = ranked[0]
  const status = !best || best.lexicalEvidence < 0.18 || best.score < 30
    ? 'unresolved'
    : best.score >= 58 && best.lexicalEvidence >= 0.35 && best.queryCoverage >= 0.7 ? 'matched' : 'low_confidence'
  const selectedProduct = status === 'matched' ? best.product : null
  const reason = status === 'matched'
    ? `Matched to ${best.product.name}: ${best.reason}.`
    : status === 'low_confidence'
      ? `Possible match ${best.product.name}, but confirmation is recommended: ${best.reason}.`
      : 'No catalogue product had sufficient name evidence; no match was selected.'
  const alternatives = ranked.filter((candidate) => candidate.product.articleNumber !== selectedProduct?.articleNumber && candidate.score >= 15).slice(0, 3)
    .map(({ product, score, reason: candidateReason }) => ({ product, score, reason: candidateReason }))
  return {
    ingredientKey: ingredient.ingredientKey,
    ingredientName: ingredient.name,
    normalizedIngredientName: normalizeIngredientForMatching(ingredient.name),
    requiredAmount: ingredient.amount,
    requiredUnit: ingredient.unit,
    sourceMenuItemIds: [...ingredient.sourceMenuItemIds],
    status,
    selectedProduct,
    score: best?.score ?? 0,
    reason,
    alternatives,
  }
}

export function matchProducts(ingredients: ProductMatchIngredient[], products: CanonicalProduct[]): ProductMatchPlan {
  const matches = ingredients.map((ingredient) => matchIngredient(ingredient, products))
  return {
    matches,
    summary: {
      totalIngredients: matches.length,
      matched: matches.filter(({ status }) => status === 'matched').length,
      lowConfidence: matches.filter(({ status }) => status === 'low_confidence').length,
      unresolved: matches.filter(({ status }) => status === 'unresolved').length,
      selectedProductsWithPrice: matches.filter(({ selectedProduct }) => selectedProduct?.priceCHF !== null && selectedProduct !== null).length,
    },
  }
}
