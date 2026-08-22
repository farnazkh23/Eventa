import { loadCanonicalCatalogue } from '../products/canonicalCatalogue.js'
import { matchProducts } from '../products/productMatcher.js'

const menuFixtures = [
  { name: 'Corporate summer buffet', ingredients: ['chicken breast', 'risotto rice', 'butter', 'cream', 'mushrooms', 'tomatoes', 'olive oil'] },
  { name: 'Birthday seated dinner', ingredients: ['beef', 'potatoes', 'carrots', 'onions', 'red wine', 'chocolate', 'strawberries'] },
  { name: 'Vegetarian gluten-free apero', ingredients: ['tofu', 'chickpeas', 'bell peppers', 'cucumber', 'basil', 'gluten-free bread', 'sumac', 'edible flowers'] },
]

const catalogue = await loadCanonicalCatalogue()
const ingredientFrequency = new Map<string, number>()
let total = 0; let matched = 0; let lowConfidence = 0; let unresolved = 0; let priced = 0

for (const fixture of menuFixtures) {
  const plan = matchProducts(fixture.ingredients.map((name, index) => ({
    ingredientKey: `${fixture.name}:${index}`,
    name,
    amount: 1000,
    unit: 'g',
    sourceMenuItemIds: [`${fixture.name}:menu-item`],
  })), catalogue)
  console.info(`\n${fixture.name}`)
  for (const result of plan.matches) {
    console.info(`- ${result.ingredientName}: ${result.status}${result.selectedProduct ? ` -> ${result.selectedProduct.name} (${result.selectedProduct.articleNumber})` : ''} [${result.score}]`)
    total += 1
    if (result.status === 'matched') matched += 1
    else if (result.status === 'low_confidence') lowConfidence += 1
    else { unresolved += 1; ingredientFrequency.set(result.ingredientName, (ingredientFrequency.get(result.ingredientName) ?? 0) + 1) }
    if (result.selectedProduct?.priceCHF !== null && result.selectedProduct) priced += 1
  }
}

const selected = matched
console.info('\nVerification summary')
console.info(`Overall confirmed match rate: ${total ? ((selected / total) * 100).toFixed(1) : '0.0'}% (${selected}/${total})`)
console.info(`High-confidence matches: ${matched}`)
console.info(`Low-confidence matches: ${lowConfidence}`)
console.info(`Unresolved ingredients: ${unresolved}`)
console.info(`Selected-product price coverage: ${selected ? ((priced / selected) * 100).toFixed(1) : '0.0'}% (${priced}/${selected})`)
console.info(`Top missing ingredients: ${[...ingredientFrequency].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map(([name, count]) => `${name} (${count})`).join(', ') || 'none'}`)
