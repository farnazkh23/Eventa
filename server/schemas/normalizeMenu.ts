import type { EventMenu, MenuCourse } from '../../shared/menu.js'
import { eventMenuSchema, type GeneratedMenu } from './menu.js'

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeList(values: string[], lowercase: boolean): string[] {
  const normalized = values
    .map(normalizeWhitespace)
    .filter(Boolean)
    .map((value) => (lowercase ? value.toLocaleLowerCase('en') : value))

  return [...new Set(normalized)]
}

function normalizeUnit(value: string): string {
  const normalized = normalizeWhitespace(value).toLocaleLowerCase('en')
  const aliases: Record<string, string> = {
    gram: 'g',
    grams: 'g',
    kilogram: 'kg',
    kilograms: 'kg',
    milliliter: 'ml',
    milliliters: 'ml',
    litre: 'l',
    litres: 'l',
    liter: 'l',
    liters: 'l',
    pieces: 'piece',
  }
  return aliases[normalized] ?? normalized
}

function hashText(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)

  return slug || 'menu-item'
}

export function createStableMenuItemId(course: MenuCourse, name: string): string {
  const identity = `${course}|${normalizeWhitespace(name).toLocaleLowerCase('en')}`
  return `${course}-${slugify(name)}-${hashText(identity)}`
}

export function normalizeMenu(input: GeneratedMenu): EventMenu {
  const duplicateCounts = new Map<string, number>()

  const menu: EventMenu = {
    title: normalizeWhitespace(input.title),
    summary: normalizeWhitespace(input.summary),
    items: input.items.map((item) => {
      const baseId = createStableMenuItemId(item.course, item.name)
      const occurrence = (duplicateCounts.get(baseId) ?? 0) + 1
      duplicateCounts.set(baseId, occurrence)

      return {
        id: occurrence === 1 ? baseId : `${baseId}-${occurrence}`,
        course: item.course,
        name: normalizeWhitespace(item.name),
        description: normalizeWhitespace(item.description),
        dietaryTags: normalizeList(item.dietaryTags, true),
        portion: item.portion
          ? { amount: item.portion.amount, unit: normalizeUnit(item.portion.unit) }
          : null,
        ingredients: item.ingredients.map((ingredient) => ({
          name: normalizeWhitespace(ingredient.name).toLocaleLowerCase('en'),
          amountPerServing: ingredient.amountPerServing,
          unit: ingredient.unit ? normalizeUnit(ingredient.unit) : null,
        })),
        servingScope: item.servingScope,
      }
    }),
    planningAssumptions: normalizeList(input.planningAssumptions, false),
  }

  return eventMenuSchema.parse(menu)
}
