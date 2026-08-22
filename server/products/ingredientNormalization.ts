const tokenAliases: Record<string, string> = {
  huhn: 'chicken', huhner: 'chicken', poulet: 'chicken', gefluegel: 'chicken', brust: 'breast',
  rind: 'beef', rinds: 'beef', schwein: 'pork', lachs: 'salmon', reis: 'rice',
  kartoffel: 'potato', kartoffeln: 'potato', tomate: 'tomato', tomaten: 'tomato',
  rahm: 'cream', sahne: 'cream', milch: 'milk', kaese: 'cheese', fromage: 'cheese', formaggio: 'cheese',
  pilz: 'mushroom', pilze: 'mushroom', champignons: 'mushroom', zwiebel: 'onion', zwiebeln: 'onion',
  knoblauch: 'garlic', karotte: 'carrot', karotten: 'carrot', rueebli: 'carrot',
  oel: 'oil', olivenoel: 'oliveoil', mehl: 'flour', brot: 'bread', nudeln: 'pasta', teigwaren: 'pasta',
  gemuese: 'vegetable', salat: 'salad', basilikum: 'basil', petersilie: 'parsley', zitrone: 'lemon',
  erdbeere: 'strawberry', erdbeeren: 'strawberry', jogurt: 'yogurt', yogourt: 'yogurt',
  mushrooms: 'mushroom', potatoes: 'potato', carrots: 'carrot', onions: 'onion', tomatoes: 'tomato',
  strawberries: 'strawberry', peppers: 'pepper', chickpeas: 'chickpea', cucumbers: 'cucumber',
  blueberries: 'blueberry', heidelbeere: 'blueberry', heidelbeeren: 'blueberry',
  greens: 'salad', blumenkohl: 'cauliflower', radiesli: 'radish',
}

const ignoredTokens = new Set(['fresh', 'frisch', 'frische', 'seasonal', 'organic', 'bio', 'quality', 'original', 'whole', 'diced', 'sliced', 'mixed', 'menu', 'menue'])

function foldText(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss')
}

export function normalizeProductText(value: string): string {
  return foldText(value)
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function ingredientTokens(value: string): string[] {
  const raw = normalizeProductText(value).split(' ').filter(Boolean)
  const tokens = raw
    .flatMap((token) => token.includes('risottoreis') ? ['risotto', 'rice'] : [canonicalizeToken(token)])
    .filter((token) => !ignoredTokens.has(token) && !/^\d+(?:g|kg|ml|l)?$/.test(token))
  return [...new Set(tokens)]
}

function canonicalizeToken(token: string): string {
  const alias = tokenAliases[token]
  if (alias) return alias
  const compoundRules: Array<[string, string]> = [
    ['butter', 'butter'], ['rahm', 'cream'], ['tomat', 'tomato'], ['karott', 'carrot'],
    ['ruebli', 'carrot'], ['zwiebel', 'onion'], ['schokolad', 'chocolate'], ['erdbeer', 'strawberry'],
    ['kichererb', 'chickpea'], ['gurke', 'cucumber'], ['peperoni', 'pepper'], ['champignon', 'mushroom'],
  ]
  return compoundRules.find(([fragment]) => token.includes(fragment))?.[1] ?? token
}

export function normalizeIngredientForMatching(value: string): string {
  return ingredientTokens(value).join(' ')
}

const classificationRules: Array<{ tokens: string[]; category: string; subcategory?: string }> = [
  { tokens: ['chicken'], category: 'meat_poultry', subcategory: 'chicken' },
  { tokens: ['beef'], category: 'meat_poultry', subcategory: 'beef' },
  { tokens: ['pork'], category: 'meat_poultry', subcategory: 'pork' },
  { tokens: ['salmon'], category: 'fish_seafood', subcategory: 'salmon' },
  { tokens: ['tuna'], category: 'fish_seafood', subcategory: 'tuna' },
  { tokens: ['risotto', 'rice'], category: 'rice_pasta_grains', subcategory: 'rice_risotto' },
  { tokens: ['chickpea'], category: 'rice_pasta_grains' },
  { tokens: ['rice'], category: 'rice_pasta_grains' },
  { tokens: ['pasta'], category: 'rice_pasta_grains', subcategory: 'pasta' },
  { tokens: ['bread'], category: 'bread_bakery' },
  { tokens: ['butter'], category: 'dairy_eggs', subcategory: 'butter' },
  { tokens: ['cream'], category: 'dairy_eggs', subcategory: 'cream' },
  { tokens: ['milk'], category: 'dairy_eggs', subcategory: 'milk' },
  { tokens: ['cheese'], category: 'dairy_eggs', subcategory: 'cheese' },
  { tokens: ['yogurt'], category: 'dairy_eggs', subcategory: 'yogurt' },
  { tokens: ['tofu'], category: 'plant_based', subcategory: 'tofu' },
  { tokens: ['mayonnaise'], category: 'sauces_condiments', subcategory: 'mayonnaise' },
  { tokens: ['mustard'], category: 'sauces_condiments', subcategory: 'mustard' },
  { tokens: ['oil'], category: 'sauces_condiments' },
  { tokens: ['flour'], category: 'dessert_ingredients', subcategory: 'flour' },
  { tokens: ['cocoa'], category: 'dessert_ingredients', subcategory: 'cocoa_powder' },
  { tokens: ['potato'], category: 'vegetables_fruit', subcategory: 'potatoes' },
  { tokens: ['tomato'], category: 'vegetables_fruit', subcategory: 'tomatoes' },
  { tokens: ['mushroom'], category: 'vegetables_fruit', subcategory: 'mushrooms' },
  { tokens: ['onion'], category: 'vegetables_fruit', subcategory: 'onions' },
  { tokens: ['carrot'], category: 'vegetables_fruit' },
  { tokens: ['pepper'], category: 'vegetables_fruit', subcategory: 'peppers' },
  { tokens: ['cucumber'], category: 'vegetables_fruit' },
  { tokens: ['strawberry'], category: 'vegetables_fruit', subcategory: 'berries' },
  { tokens: ['lemon'], category: 'vegetables_fruit', subcategory: 'lemons' },
  { tokens: ['basil'], category: 'vegetables_fruit', subcategory: 'fresh_herbs' },
  { tokens: ['salad'], category: 'vegetables_fruit', subcategory: 'leafy_greens' },
  { tokens: ['broccoli'], category: 'vegetables_fruit', subcategory: 'broccoli' },
  { tokens: ['cauliflower'], category: 'vegetables_fruit' },
  { tokens: ['radish'], category: 'vegetables_fruit' },
  { tokens: ['blueberry'], category: 'vegetables_fruit', subcategory: 'berries' },
]

export function inferProductTaxonomy(name: string): { category?: string; subcategory?: string } {
  const tokens = ingredientTokens(name)
  const match = classificationRules.find((rule) => rule.tokens.every((token) => tokens.includes(token)))
  return match ? { category: match.category, ...(match.subcategory ? { subcategory: match.subcategory } : {}) } : {}
}
