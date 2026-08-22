import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CanonicalProduct } from '../../shared/productMatching.js'

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1 } else quoted = !quoted
    } else if (character === ',' && !quoted) { row.push(field); field = '' }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(field); field = ''
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
    } else field += character
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

function nullable(value: string | undefined): string | null { return value?.trim() ? value.trim() : null }
function numberOrNull(value: string | undefined): number | null {
  if (!value?.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function loadCanonicalCatalogue(
  path = join(process.cwd(), 'data', 'transgourmet-products.canonical.csv'),
): Promise<CanonicalProduct[]> {
  const rows = parseCsv(await readFile(path, 'utf8'))
  const header = rows.shift()?.map((value, index) => index === 0 ? value.replace(/^\uFEFF/, '') : value)
  if (!header) throw new Error('Canonical catalogue is empty.')
  const products = rows.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])))
  const articleNumbers = new Set<string>()
  return products.map((row) => {
    if (!/^\d{6}$/.test(row.articleNumber) || !row.name || !row.category) throw new Error(`Invalid canonical product ${row.articleNumber || '(blank)'}.`)
    if (articleNumbers.has(row.articleNumber)) throw new Error(`Duplicate canonical article ${row.articleNumber}.`)
    articleNumbers.add(row.articleNumber)
    return {
      articleNumber: row.articleNumber,
      name: row.name,
      brand: nullable(row.brand),
      category: row.category,
      subcategory: nullable(row.subcategory),
      packSizeValue: numberOrNull(row.packSizeValue),
      packSizeUnit: nullable(row.packSizeUnit),
      salesUnit: nullable(row.salesUnit),
      unitsPerSalesUnit: numberOrNull(row.unitsPerSalesUnit),
      priceCHF: numberOrNull(row.priceCHF),
      priceBasis: nullable(row.priceBasis),
      sourceUrl: nullable(row.sourceUrl),
      verificationStatus: row.verificationStatus || 'unverified',
      hasUnresolvedConflict: row.nameConflict === 'true' || row.packConflict === 'true',
    }
  })
}
