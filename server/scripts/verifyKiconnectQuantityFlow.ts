import { KiconnectProvider } from '../ai/kiconnectProvider.js'
import { KiconnectFailoverProvider } from '../ai/kiconnectFailoverProvider.js'
import { loadServerConfig } from '../config/env.js'
import { loadCanonicalCatalogue } from '../products/canonicalCatalogue.js'
import { matchProducts } from '../products/productMatcher.js'
import { calculateQuantityPlan } from '../quantities/quantityEngine.js'
import { productMatchPlanSchema } from '../schemas/productMatching.js'
import { calculateQuantitiesRequestSchema, quantityPlanSchema } from '../schemas/quantities.js'

const description = 'Corporate summer party for 120 people in Bern. We want a relaxed dinner buffet with one meat main, one vegetarian option and one vegan option for 8 guests. 5 guests are gluten-free. Budget is around CHF 50 per person. Please include a fresh starter, two side dishes, dessert and non-alcoholic drinks.'

const config = loadServerConfig()
if (!config.kiconnectApiKey) throw new Error('KICONNECT_API_KEY is not configured in .env.local')

const provider = new KiconnectFailoverProvider(
  new KiconnectProvider(config.kiconnectApiKey, config.kiconnectBaseUrl, config.kiconnectModel),
  new KiconnectProvider(config.kiconnectApiKey, config.kiconnectBaseUrl, config.kiconnectFallbackModel, {
    allowPartialQuantityDataAfterCorrection: true,
  }),
  config.kiconnectModel,
  config.kiconnectFallbackModel,
)

const event = await provider.interpret(description)
const menu = await provider.generate({ event, originalDescription: description })
const quantityInput = calculateQuantitiesRequestSchema.parse({ event, menu })
const plan = quantityPlanSchema.parse(calculateQuantityPlan(quantityInput))
const productPlan = productMatchPlanSchema.parse(matchProducts(
  plan.ingredientRequirements,
  await loadCanonicalCatalogue(),
))
const missingIngredients = menu.items.flatMap((item) => item.ingredients
  .filter((ingredient) => ingredient.amountPerServing === null || ingredient.unit === null)
  .map((ingredient) => ({ menuItem: item.name, ingredient: ingredient.name })))

console.info(JSON.stringify({
  event,
  menu: {
    title: menu.title,
    items: menu.items.map((item) => ({
      id: item.id,
      course: item.course,
      name: item.name,
      servingScope: item.servingScope,
      dietaryTags: item.dietaryTags,
      ingredientCount: item.ingredients.length,
    })),
    missingIngredients,
  },
  quantities: {
    isComplete: plan.isComplete,
    completenessPercent: plan.itemAllocations.length === 0
      ? 0
      : Math.round(plan.itemAllocations.filter(({ status }) => status === 'calculated').length
        / plan.itemAllocations.length * 1000) / 10,
    calculatedIngredientCount: plan.ingredientRequirements.length,
    allocations: plan.itemAllocations,
    unresolved: plan.unresolved,
    unresolvedIngredients: plan.unresolvedIngredients,
  },
  products: {
    summary: productPlan.summary,
    matchedPercent: productPlan.summary.totalIngredients === 0
      ? 0
      : Math.round(productPlan.summary.matched / productPlan.summary.totalIngredients * 1000) / 10,
    selectedProductPriceCoveragePercent: productPlan.summary.matched === 0
      ? 0
      : Math.round(productPlan.summary.selectedProductsWithPrice / productPlan.summary.matched * 1000) / 10,
    matches: productPlan.matches.map((match) => ({
      ingredientName: match.ingredientName,
      requiredAmount: match.requiredAmount,
      requiredUnit: match.requiredUnit,
      status: match.status,
      selectedProduct: match.selectedProduct ? {
        articleNumber: match.selectedProduct.articleNumber,
        name: match.selectedProduct.name,
        priceCHF: match.selectedProduct.priceCHF,
      } : null,
      alternatives: match.alternatives.map(({ product, score }) => ({
        articleNumber: product.articleNumber,
        name: product.name,
        score,
      })),
      reason: match.reason,
    })),
  },
}, null, 2))
