import type { MenuGenerationInput } from '../ai/menuGenerator.js'
import type { EventMenu } from '../../shared/menu.js'
import { menuIngredientUnits } from './menu.js'

export interface MenuPlanningPolicyOptions {
  allowMissingIngredientQuantities?: boolean
}

function extractNumbers(value: string): Set<string> {
  return new Set(
    [...value.matchAll(/\b\d+(?:[.,]\d+)?\b/g)].map((match) => match[0].replace(',', '.')),
  )
}

export function assertNoDerivedPlanningNumbers(
  input: MenuGenerationInput,
  menu: EventMenu,
): void {
  const supportedNumbers = extractNumbers(JSON.stringify(input))
  const assumptionNumbers = extractNumbers(menu.planningAssumptions.join(' '))
  const derivedNumbers = [...assumptionNumbers].filter((number) => !supportedNumbers.has(number))

  if (derivedNumbers.length > 0) {
    throw new Error('Menu planning assumptions contain derived numeric allocations')
  }
}

function normalizeDietaryValue(value: string): string {
  return value.trim().toLocaleLowerCase('en').replace(/\s+/g, ' ')
}

function itemSupportsDietaryType(item: EventMenu['items'][number], dietaryType: string): boolean {
  const normalizedType = normalizeDietaryValue(dietaryType)
  const tags = item.dietaryTags.map(normalizeDietaryValue)
  return tags.includes(normalizedType)
}

/**
 * Guards the AI-authored planning metadata consumed by deterministic quantity
 * calculation. Nullable quantities remain part of the contract so genuinely
 * unquantifiable ingredients can be returned as explicit partial results.
 */
export function assertMenuPlanningPolicy(
  input: MenuGenerationInput,
  menu: EventMenu,
  options: MenuPlanningPolicyOptions = {},
): void {
  assertNoDerivedPlanningNumbers(input, menu)

  const issues: string[] = []
  const supportedUnits = new Set<string>(menuIngredientUnits)

  for (const item of menu.items) {
    if (item.course === 'vegetarian' || item.course === 'vegan') {
      issues.push(`${item.name}: dietary properties belong in dietaryTags; use main as the course`)
    }
    const allocationType = item.dietaryAllocationType
      ? normalizeDietaryValue(item.dietaryAllocationType)
      : null
    if (item.servingScope === 'dietary_option') {
      if (allocationType === null) {
        issues.push(`${item.name}: dietary_option requires one dietaryAllocationType`)
      } else if (!item.dietaryTags.map(normalizeDietaryValue).includes(allocationType)) {
        issues.push(`${item.name}: dietaryAllocationType must also appear in dietaryTags`)
      } else if (!input.event.dietaryRequirements.some((requirement) =>
        normalizeDietaryValue(requirement.type) === allocationType)) {
        issues.push(`${item.name}: dietaryAllocationType does not match a confirmed requirement`)
      }
    } else if (allocationType !== null) {
      issues.push(`${item.name}: dietaryAllocationType is only valid for dietary_option`)
    }
    for (const ingredient of item.ingredients) {
      const hasAmount = ingredient.amountPerServing !== null
      const hasUnit = ingredient.unit !== null
      if (hasAmount !== hasUnit) {
        issues.push(`${item.name}: ${ingredient.name} must provide both amountPerServing and unit`)
      } else if (!hasAmount && !options.allowMissingIngredientQuantities) {
        issues.push(`${item.name}: ${ingredient.name} is missing a per-serving quantity`)
      } else if (ingredient.unit !== null && !supportedUnits.has(ingredient.unit)) {
        issues.push(`${item.name}: ${ingredient.name} uses unsupported unit ${ingredient.unit}`)
      }
    }
  }

  const mainItems = menu.items.filter((item) =>
    item.course === 'main' || item.course === 'vegetarian' || item.course === 'vegan')

  if (mainItems.length > 0) {
    const hasDietaryMainAlternative = mainItems.some((item) => item.servingScope === 'dietary_option')
    if (hasDietaryMainAlternative) {
      mainItems
        .filter((item) => item.servingScope === 'shared')
        .forEach((item) => issues.push(
          `${item.name}: a standard main alongside dietary alternatives must use all_guests so deterministic subtraction can be applied`,
        ))
    }
    for (const requirement of input.event.dietaryRequirements) {
      const compatibleItems = mainItems.filter((item) => itemSupportsDietaryType(item, requirement.type))
      const incompatibleItems = mainItems.filter((item) => !itemSupportsDietaryType(item, requirement.type))
      const requirementType = normalizeDietaryValue(requirement.type)

      if (compatibleItems.length === 0) {
        issues.push(`No main-course option supports dietary requirement ${requirement.type}`)
      } else if (
        incompatibleItems.length > 0
        && !compatibleItems.some((item) =>
          item.servingScope === 'dietary_option'
          && item.dietaryAllocationType !== null
          && item.dietaryAllocationType !== undefined
          && normalizeDietaryValue(item.dietaryAllocationType) === requirementType)
      ) {
        issues.push(`The ${requirement.type} main-course alternative must use dietary_option serving scope`)
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(`Menu planning policy failed: ${issues.join('; ')}`)
  }
}
