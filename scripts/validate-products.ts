import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const allowedCategories = new Set(['meat_poultry','fish_seafood','vegetables_fruit','dairy_eggs','rice_pasta_grains','bread_bakery','sauces_condiments','plant_based','dessert_ingredients','non_alcoholic_drinks'])
const allowedUnits = new Set(['kg','g','l','ml','piece'])
function parse(line: string): string[] { const result: string[]=[]; let value=''; let quoted=false; for(let i=0;i<line.length;i++){const c=line[i]; if(c==='"'&&quoted&&line[i+1]==='"'){value+='"';i++;}else if(c==='"')quoted=!quoted;else if(c===','&&!quoted){result.push(value);value='';}else value+=c;} result.push(value); return result }

const path = join(process.cwd(), 'data', 'transgourmet-products.normalized.csv')
const lines = (await readFile(path, 'utf8')).trim().split(/\r?\n/)
const header = parse(lines.shift() ?? '')
const rows = lines.map((line) => Object.fromEntries(header.map((key,index)=>[key,parse(line)[index]??''])))
const errors: string[] = []; const articleNumbers = new Set<string>(); const categoryCounts = new Map<string,number>()
let priced = 0; let fullyVerified = 0
for (const [index,row] of rows.entries()) {
  const label = `row ${index + 2}`
  if (!/^\d{6}$/.test(row.articleNumber)) errors.push(`${label}: invalid articleNumber`)
  if (articleNumbers.has(row.articleNumber)) errors.push(`${label}: duplicate articleNumber ${row.articleNumber}`)
  articleNumbers.add(row.articleNumber)
  if (!row.name) errors.push(`${label}: missing name`)
  if (!allowedCategories.has(row.category)) errors.push(`${label}: invalid category ${row.category}`)
  if (row.packSizeUnit && !allowedUnits.has(row.packSizeUnit)) errors.push(`${label}: invalid unit ${row.packSizeUnit}`)
  if (row.packSizeValue && !(Number(row.packSizeValue) > 0)) errors.push(`${label}: invalid packSizeValue`)
  if (row.priceCHF && !(Number(row.priceCHF) >= 0)) errors.push(`${label}: invalid priceCHF`)
  if (!row.sourceUrl.startsWith('https://www-static.transgourmet.ch/public/')) errors.push(`${label}: source is not an approved official public URL`)
  categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1)
  if (row.priceCHF) priced += 1
  if (row.verificationStatus === 'verified_public_source') fullyVerified += 1
}
console.info(`Products: ${rows.length}`)
for (const [category,count] of [...categoryCounts].sort()) console.info(`${category}: ${count}`)
console.info(`With prices: ${priced}`)
console.info(`Fully verified: ${fullyVerified}`)
if (rows.length < 250 || rows.length > 300) errors.push(`expected 250-300 products, found ${rows.length}`)
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 } else console.info('Validation passed.')
