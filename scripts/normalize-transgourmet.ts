import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const COLUMNS = ['articleNumber','name','brand','category','subcategory','packSizeValue','packSizeUnit','salesUnit','unitsPerSalesUnit','ingredients','dietaryTags','allergens','origin','priceCHF','priceBasis','sourceUrl','verifiedAt','verificationStatus','notes'] as const
type Row = Record<(typeof COLUMNS)[number], string>
interface RawProduct { articleNumber: string; text: string; sourceUrl: string; defaultCategory: Row['category']; scrapedAt: string }

function csvCell(value: string): string { return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value }
function parseCsvLine(line: string): string[] {
  const values: string[] = []; let value = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { values.push(value); value = '' }
    else value += char
  }
  values.push(value); return values
}
function parseCsv(csv: string): Row[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  const header = parseCsvLine(lines.shift() ?? '')
  return lines.map((line) => Object.fromEntries(header.map((key, index) => [key, parseCsvLine(line)[index] ?? ''])) as Row)
}

const unitMap: Record<string, { unit: string; factor: number }> = { kg:{unit:'kg',factor:1}, g:{unit:'g',factor:1}, l:{unit:'l',factor:1}, ml:{unit:'ml',factor:1}, cl:{unit:'ml',factor:10}, dl:{unit:'ml',factor:100}, stück:{unit:'piece',factor:1}, stk:{unit:'piece',factor:1} }
function categoryFor(text: string, fallback: string): string {
  const value = text.toLocaleLowerCase('de')
  if (fallback === 'plant_based' || fallback === 'fish_seafood' || fallback === 'meat_poultry' || fallback === 'vegetables_fruit' || fallback === 'dairy_eggs' || fallback === 'non_alcoholic_drinks') return fallback
  if (/wasser|cola|eistee|drink|saft|sirup|punch/.test(value)) return 'non_alcoholic_drinks'
  if (/tofu|vegan|plant-based|soja|haferdrink|mandeldrink|fleischalternative/.test(value)) return 'plant_based'
  if (/lachs|fisch|filet|crevette|garnelen|pangasius|zander|scholle|seelachs|seafood|meeresfr/.test(value)) return fallback === 'fish_seafood' ? fallback : 'fish_seafood'
  if (/poulet|rind|kalb|schwein|lamm|ente|fleisch|wurst|burger/.test(value) && fallback !== 'plant_based') return 'meat_poultry'
  if (/milch|rahm|butter|käse|brie|mascarpone|joghurt|ei\b/.test(value)) return 'dairy_eggs'
  if (/brot|bröt|gipfel|croissant|baguette|toast|backwar/.test(value)) return 'bread_bakery'
  if (/reis|pasta|teigwaren|nudel|spaghetti|mehl|quinoa|couscous|mais/.test(value)) return 'rice_pasta_grains'
  if (/sauce|mayonnaise|senf|öl|essig|gewürz|dressing|tartaraise/.test(value)) return 'sauces_condiments'
  if (/schokolade|dessert|zucker|crème|creme|kakao|vanille|biskuit/.test(value)) return 'dessert_ingredients'
  return fallback
}

function normalize(raw: RawProduct): Row | null {
  const sourceText = raw.text.replace(/\s+/g, ' ').trim().replace(new RegExp(`^${raw.articleNumber}\\s+`), '')
  const text = sourceText.split(/\s(?=\d{6}\s)/, 1)[0] ?? sourceText
  const packMatches = [...text.matchAll(/(?:(\d+)\s*x\s*)?(?:(\d+)\s*x\s*)?(?:ca\.\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|dl|l|Stück|Stk\.)\b/gi)]
  const pack = packMatches.find((candidate) => candidate[1] || candidate[2]) ?? packMatches.at(-1)
  const definition = pack ? unitMap[pack[4]!.replace('.', '').toLocaleLowerCase('de')] : undefined
  const units = pack ? Number(pack[1] ?? 1) * Number(pack[2] ?? 1) : 1
  const packValue = pack && definition ? Number(pack[3]!.replace(',', '.')) * definition.factor : null
  const beforePack = pack ? text.slice(0, pack.index).trim() : text
  const tokens = beforePack.split(' ').filter(Boolean)
  const brands = ['The Vegetarian Butcher','The Green Mountain','The Beyond','Garden Gourmet','Quality','Natura','Origine','Premium','Economy','Hilcona','Fredag','Alpro','Soyana','Outlawz','Emmi','Floralp','Comella','Kiri','Cantadou','Züger','Thomy','Cailler','Nestlé','Coca-Cola','Aquina','Henniez','Nestea','Pepita','Club Mate']
  const knownBrand = brands.find((brand) => beforePack.toLocaleLowerCase('de').startsWith(brand.toLocaleLowerCase('de'))) ?? ''
  if (knownBrand) tokens.splice(0, knownBrand.split(' ').length)
  const name = tokens.join(' ').replace(/\s+/g, ' ').trim()
  if (!/^\d{6}$/.test(raw.articleNumber) || name.length < 2) return null
  const price = text.match(/\b(?:kg|g|l|ml|Stück)\s+(\d{1,3}[.,]\d{2})\b/i)
  const category = categoryFor(name, raw.defaultCategory)
  const vegan = /\bvegan(?:e|er|es)?\b/i.test(text)
  const glutenFree = /glutenfrei/i.test(text)
  const lactoseFree = /laktosefrei/i.test(text)
  const packComplete = packValue !== null && definition !== undefined
  return {
    articleNumber: raw.articleNumber, name, brand: knownBrand, category,
    subcategory: '', packSizeValue: packComplete ? String(packValue) : '', packSizeUnit: definition?.unit ?? '',
    salesUnit: units > 1 ? 'case' : definition?.unit === 'piece' ? 'piece' : 'package', unitsPerSalesUnit: String(units),
    ingredients: '', dietaryTags: [vegan ? 'vegan' : '', glutenFree ? 'gluten-free' : '', lactoseFree ? 'lactose-free' : ''].filter(Boolean).join('|'),
    allergens: '', origin: '', priceCHF: price?.[1]?.replace(',', '.') ?? '', priceBasis: price ? (pack?.[0]?.trim() ?? '') : '',
    sourceUrl: raw.sourceUrl, verifiedAt: raw.scrapedAt, verificationStatus: packComplete && name.length <= 180 ? 'verified_public_source' : 'partial_public_source',
    notes: packComplete ? 'Extracted from an official public Transgourmet PDF.' : 'Official public source; pack details require review.',
  }
}

const root = process.cwd()
const seed = parseCsv(await readFile(join(root, 'data', 'transgourmet-products.csv'), 'utf8'))
const raw = JSON.parse(await readFile(join(root, 'data', 'intermediate', 'transgourmet-scraped.json'), 'utf8')) as RawProduct[]
const merged = new Map<string, Row>()
for (const row of seed) if (row.articleNumber) merged.set(row.articleNumber.padStart(6, '0'), row)
for (const product of raw) { const row = normalize(product); if (row && !merged.has(row.articleNumber)) merged.set(row.articleNumber, row) }

const categoryLimits: Record<string, number> = {
  plant_based: 70, vegetables_fruit: 70, fish_seafood: 30, meat_poultry: 30,
  rice_pasta_grains: 25, non_alcoholic_drinks: 20, dairy_eggs: 20,
  sauces_condiments: 15, dessert_ingredients: 15, bread_bakery: 15,
}
const counts = new Map<string, number>()
const curated = [...merged.values()].filter((row) => {
  const count = counts.get(row.category) ?? 0
  if (count >= (categoryLimits[row.category] ?? 0)) return false
  counts.set(row.category, count + 1); return true
}).slice(0, 280)
const csv = [COLUMNS.join(','), ...curated.map((row) => COLUMNS.map((column) => csvCell(row[column] ?? '')).join(','))].join('\n')
await writeFile(join(root, 'data', 'transgourmet-products.normalized.csv'), `${csv}\n`, 'utf8')
console.info(`Normalized ${curated.length} products (${seed.length} seed, ${raw.length} scraped candidates).`)
