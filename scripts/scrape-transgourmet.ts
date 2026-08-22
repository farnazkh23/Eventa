import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PDFParse } from 'pdf-parse'

type Category = 'meat_poultry' | 'fish_seafood' | 'vegetables_fruit' | 'dairy_eggs' | 'rice_pasta_grains' | 'bread_bakery' | 'sauces_condiments' | 'plant_based' | 'dessert_ingredients' | 'non_alcoholic_drinks'

interface Source { id: string; url: string; defaultCategory: Category; maxProducts: number; include?: RegExp }
interface RawProduct { articleNumber: string; text: string; sourceUrl: string; sourceId: string; defaultCategory: Category; scrapedAt: string }

const SOURCES: Source[] = [
  { id: 'plant-based-2024', url: 'https://www-static.transgourmet.ch/public/2024-04/kw15-bgh-plant-based-kompetenzbroschuere-d.pdf', defaultCategory: 'plant_based', maxProducts: 70 },
  { id: 'vegetable-convenience-2024', url: 'https://www-static.transgourmet.ch/public/2024-12/bgh-bestellvorlage_convenience.pdf', defaultCategory: 'vegetables_fruit', maxProducts: 70 },
  { id: 'fish-care-2024', url: 'https://www-static.transgourmet.ch/public/2024-07/2024_1187_tg-care_kompetenz_fisch_d.pdf', defaultCategory: 'fish_seafood', maxProducts: 30 },
  { id: 'meat-care-2024', url: 'https://www-static.transgourmet.ch/public/2024-03/2024_0062_tg-care_kompetenz_fleisch_d_94986_1.pdf', defaultCategory: 'meat_poultry', maxProducts: 30 },
  { id: 'natura-food-2022-v2', url: 'https://www-static.transgourmet.ch/public/2022-06/kw24-bgh-natura-sortimentsbroeschuere-d.pdf', defaultCategory: 'rice_pasta_grains', maxProducts: 25, include: /Reis|Teigwaren|Pasta|Spaghetti|Mehl|Quinoa|Couscous|Mais|Hafer|Getreide/i },
  { id: 'drinks-2024-v2', url: 'https://www-static.transgourmet.ch/public/2024-02/kw09-bgh-lastminute-d.pdf', defaultCategory: 'non_alcoholic_drinks', maxProducts: 20, include: /Mineralwasser|Coca-Cola|Nestea|Eistee|Saft|Pepita|Aquina|Henniez|Club Mate|Getränk/i },
  { id: 'dairy-2024-v2', url: 'https://www-static.transgourmet.ch/public/2024-11/lastminute_bgh_kw48_2024_d.pdf', defaultCategory: 'dairy_eggs', maxProducts: 20, include: /Milch|Rahm|Butter|Mascarpone|Brie|Käse|Joghurt|Mozzarella|Emmi|Floralp|Comella|Kiri|Cantadou|Züger/i },
  { id: 'food-guide-2024-v2', url: 'https://www-static.transgourmet.ch/public/2024-10/kw45-bgh-guide-november-d.pdf', defaultCategory: 'sauces_condiments', maxProducts: 15, include: /Sauce|Mayonnaise|Tartaraise|Dressing|Senf|Essig|Gewürz|Schokolade|Dessert/i },
]

const RAW_DIR = join(process.cwd(), 'data', 'raw', 'transgourmet')
const OUTPUT = join(process.cwd(), 'data', 'intermediate', 'transgourmet-scraped.json')
const USER_AGENT = 'EventaHackathonDataset/1.0 (+public catalogue research; contact repository owner)'

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)) }

async function fetchWithRetry(url: string): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(45_000) })
      if (response.status === 401 || response.status === 403) throw new Error(`Protected source refused access (${response.status})`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return new Uint8Array(await response.arrayBuffer())
    } catch (error) {
      if (attempt === 3 || error instanceof Error && error.message.startsWith('Protected')) throw error
      await sleep(1_500 * 2 ** (attempt - 1) + Math.round(Math.random() * 500))
    }
  }
  throw new Error('Retry loop ended unexpectedly')
}

function extractBlocks(text: string, source: Source, scrapedAt: string): RawProduct[] {
  const blocks: RawProduct[] = []
  const seen = new Set<string>()
  const standard = /Art\.-Nr\.\s*(\d{5,6})\s*([\s\S]*?)(?=Art\.-Nr\.|-- \d+ of|$)/g
  for (const match of text.matchAll(standard)) {
    const articleNumber = match[1]?.padStart(6, '0')
    const body = match[2]?.replace(/\s+/g, ' ').trim()
    if (!articleNumber || !body || seen.has(articleNumber)) continue
    seen.add(articleNumber)
    blocks.push({ articleNumber, text: body.slice(0, 2_500), sourceUrl: source.url, sourceId: source.id, defaultCategory: source.defaultCategory, scrapedAt })
  }

  if (blocks.length === 0 || source.id.includes('convenience')) {
    const rows = /(?:^|\n)(\d{6})\s+([^\n]{8,300})/g
    for (const match of text.matchAll(rows)) {
      const articleNumber = match[1]
      const body = match[2]?.replace(/\s+/g, ' ').trim()
      if (!articleNumber || !body || seen.has(articleNumber) || !/\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|Stk\.)\b/i.test(body)) continue
      seen.add(articleNumber)
      blocks.push({ articleNumber, text: body.slice(0, 2_500), sourceUrl: source.url, sourceId: source.id, defaultCategory: source.defaultCategory, scrapedAt })
    }
  }
  return blocks
}

function curateSource(products: RawProduct[], source: Source): RawProduct[] {
  return products.filter((product) => !source.include || source.include.test(product.text)).slice(0, source.maxProducts)
}

async function scrapeSource(source: Source): Promise<RawProduct[]> {
  const cachePath = join(RAW_DIR, `${source.id}.json`)
  try {
    return curateSource(JSON.parse(await readFile(cachePath, 'utf8')) as RawProduct[], source)
  } catch {
    // Missing or invalid checkpoints are downloaded again.
  }
  await sleep(1_200)
  const bytes = await fetchWithRetry(source.url)
  const parser = new PDFParse({ data: bytes })
  try {
    const result = await parser.getText()
    const scrapedAt = new Date().toISOString()
    const products = extractBlocks(result.text, source, scrapedAt)
    await writeFile(cachePath, `${JSON.stringify(products, null, 2)}\n`, 'utf8')
    return curateSource(products, source)
  } finally {
    await parser.destroy()
  }
}

await mkdir(RAW_DIR, { recursive: true })
await mkdir(join(process.cwd(), 'data', 'intermediate'), { recursive: true })
const products: RawProduct[] = []
for (const source of SOURCES) {
  const extracted = await scrapeSource(source)
  products.push(...extracted)
  console.info(`${source.id}: ${extracted.length}`)
}
await writeFile(OUTPUT, `${JSON.stringify(products, null, 2)}\n`, 'utf8')
console.info(`Saved ${products.length} raw records to ${OUTPUT}`)
