import type { DietaryRequirement } from '../../shared/eventInterpretation.js'
import type { MenuCourse, MenuItem } from '../../shared/menu.js'
import type {
  CalculateQuantitiesRequest,
  IngredientRequirement,
  ItemAllocation,
  QuantityPlan,
} from '../../shared/quantities.js'
import { normalizeIngredientName } from './ingredientNormalization.js'
import { roundQuantity, toCanonicalQuantity } from './unitConversion.js'

interface AllocationDecision {
  plannedServings: number | null
  reason?: string
}

const ASSUMPTIONS = [
  'Required quantities equal planned servings multiplied by per-serving amounts; no catering buffer is included.',
  'Shared menu items use the full event guest count as their serving basis.',
  'Dietary groups are never assumed to be mutually exclusive; ambiguous overlap requires confirmation.',
]

function normalizedText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
}

function allocationGroup(course: MenuCourse): string {
  return course === 'main' || course === 'vegetarian' || course === 'vegan'
    ? 'main'
    : course
}

function relevantRequirements(
  item: MenuItem,
  requirements: DietaryRequirement[],
  menuItems: MenuItem[],
): DietaryRequirement[] {
  const tags = new Set(item.dietaryTags.map(normalizedText))
  const unique = new Map<string, DietaryRequirement>()

  requirements.forEach((requirement) => {
    const type = normalizedText(requirement.type)
    // If every choice in a course supports a requirement, that tag describes
    // whole-course compatibility rather than the audience of this alternative.
    // For example, gluten-free tags on every main must not make a vegan option
    // appear to serve both the vegan and gluten-free guest allocations.
    const isCompatibilityTagForWholeCourse = menuItems
        .filter((candidate) => allocationGroup(candidate.course) === allocationGroup(item.course))
        .every((candidate) => candidate.dietaryTags.map(normalizedText).includes(type))
    if (tags.has(type) && !isCompatibilityTagForWholeCourse) {
      unique.set(`${type}\u0000${requirement.guestCount ?? 'unknown'}`, {
        type,
        guestCount: requirement.guestCount,
      })
    }
  })

  return [...unique.values()]
}

function dietaryAllocation(
  item: MenuItem,
  requirements: DietaryRequirement[],
  menuItems: MenuItem[],
  override: number | undefined,
): AllocationDecision {
  if (override !== undefined) return { plannedServings: override }

  const relevant = relevantRequirements(item, requirements, menuItems)
  if (relevant.length === 0) {
    return {
      plannedServings: null,
      reason: 'No confirmed dietary requirement maps unambiguously to this menu option.',
    }
  }

  const relevantTypes = new Set(relevant.map(({ type }) => type))
  if (relevantTypes.size > 1) {
    return {
      plannedServings: null,
      reason: 'This option serves multiple dietary groups whose overlap is unknown.',
    }
  }

  const counts = new Set(relevant.map(({ guestCount }) => guestCount))
  if (counts.size > 1) {
    return {
      plannedServings: null,
      reason: 'Conflicting guest counts exist for this dietary requirement.',
    }
  }

  const [count] = counts
  if (count === null || count === undefined) {
    return {
      plannedServings: null,
      reason: `The ${[...relevantTypes][0]} guest count was not specified.`,
    }
  }

  return { plannedServings: count }
}

function standardAllocation(
  item: MenuItem,
  menuItems: MenuItem[],
  requirements: DietaryRequirement[],
  decisions: Map<string, AllocationDecision>,
  guestCount: number,
  override: number | undefined,
): AllocationDecision {
  if (override !== undefined) return { plannedServings: override }

  const alternatives = menuItems.filter((candidate) =>
    candidate.servingScope === 'dietary_option'
    && allocationGroup(candidate.course) === allocationGroup(item.course))

  if (alternatives.length === 0) return { plannedServings: guestCount }

  const activeAlternatives = alternatives.filter((alternative) => {
    const decision = decisions.get(alternative.id)
    return decision?.plannedServings !== 0
  })

  if (activeAlternatives.length === 0) return { plannedServings: guestCount }

  if (activeAlternatives.some((alternative) =>
    decisions.get(alternative.id)?.plannedServings === null)) {
    return {
      plannedServings: null,
      reason: 'A dietary alternative in this course still needs a serving allocation.',
    }
  }

  const audienceCounts = new Map<string, Set<number>>()
  for (const alternative of activeAlternatives) {
    const relevant = relevantRequirements(alternative, requirements, menuItems)
    const types = new Set(relevant.map(({ type }) => type))
    if (types.size !== 1) {
      return {
        plannedServings: null,
        reason: 'The dietary audience for an alternative in this course is ambiguous.',
      }
    }

    const type = [...types][0]
    const servings = decisions.get(alternative.id)?.plannedServings
    if (!type || servings === null || servings === undefined) {
      return {
        plannedServings: null,
        reason: 'The dietary audience for an alternative in this course is ambiguous.',
      }
    }

    const counts = audienceCounts.get(type) ?? new Set<number>()
    counts.add(servings)
    audienceCounts.set(type, counts)
  }

  if (audienceCounts.size > 1) {
    return {
      plannedServings: null,
      reason: 'Dietary audiences in this course may overlap, so standard servings cannot be safely reduced.',
    }
  }

  const [counts] = audienceCounts.values()
  if (!counts || counts.size !== 1) {
    return {
      plannedServings: null,
      reason: 'Dietary alternatives for the same audience have conflicting serving allocations.',
    }
  }

  const [dietaryServings] = counts
  if (dietaryServings === undefined || dietaryServings > guestCount) {
    return {
      plannedServings: null,
      reason: 'The dietary serving allocation is not valid for this event.',
    }
  }

  return { plannedServings: guestCount - dietaryServings }
}

function addIngredientRequirement(
  requirements: Map<string, IngredientRequirement>,
  item: MenuItem,
  ingredientName: string,
  amount: number,
  unit: IngredientRequirement['unit'],
): void {
  const name = normalizeIngredientName(ingredientName)
  const ingredientKey = `${name}:${unit}`
  const existing = requirements.get(ingredientKey)

  if (existing) {
    existing.amount = roundQuantity(existing.amount + amount)
    if (!existing.sourceMenuItemIds.includes(item.id)) existing.sourceMenuItemIds.push(item.id)
    return
  }

  requirements.set(ingredientKey, {
    ingredientKey,
    name,
    amount: roundQuantity(amount),
    unit,
    sourceMenuItemIds: [item.id],
  })
}

export function calculateQuantityPlan(input: CalculateQuantitiesRequest): QuantityPlan {
  const overrides = new Map(
    (input.servingOverrides ?? []).map(({ menuItemId, servings }) => [menuItemId, servings]),
  )
  const decisions = new Map<string, AllocationDecision>()

  input.menu.items.forEach((item) => {
    const override = overrides.get(item.id)
    if (item.servingScope === 'dietary_option') {
      decisions.set(item.id, dietaryAllocation(
        item,
        input.event.dietaryRequirements,
        input.menu.items,
        override,
      ))
    } else if (item.servingScope === 'shared') {
      decisions.set(item.id, { plannedServings: override ?? input.event.guestCount })
    }
  })

  input.menu.items.forEach((item) => {
    if (item.servingScope === 'all_guests') {
      decisions.set(item.id, standardAllocation(
        item,
        input.menu.items,
        input.event.dietaryRequirements,
        decisions,
        input.event.guestCount,
        overrides.get(item.id),
      ))
    }
  })

  const ingredientRequirements = new Map<string, IngredientRequirement>()
  const itemAllocations: ItemAllocation[] = []
  const unresolved: QuantityPlan['unresolved'] = []
  const unresolvedIngredients: QuantityPlan['unresolvedIngredients'] = []

  input.menu.items.forEach((item) => {
    const decision = decisions.get(item.id) ?? {
      plannedServings: null,
      reason: 'No serving allocation could be determined.',
    }

    if (decision.plannedServings === null) {
      const reason = decision.reason ?? 'Serving allocation requires confirmation.'
      itemAllocations.push({
        menuItemId: item.id,
        menuItemName: item.name,
        course: item.course,
        plannedServings: null,
        status: 'needs_confirmation',
        reason,
      })
      unresolved.push({ menuItemId: item.id, reason })
      return
    }

    const plannedServings = decision.plannedServings
    const quantityIssues = new Set<string>()
    item.ingredients.forEach((ingredient) => {
      if (ingredient.amountPerServing === null) {
        const reason = `Missing per-serving amount for ${ingredient.name}.`
        quantityIssues.add(reason)
        unresolvedIngredients.push({
          menuItemId: item.id,
          ingredientName: ingredient.name,
          status: 'needs_confirmation',
          reason,
        })
        return
      }
      if (ingredient.unit === null) {
        const reason = `Missing unit for ${ingredient.name}.`
        quantityIssues.add(reason)
        unresolvedIngredients.push({
          menuItemId: item.id,
          ingredientName: ingredient.name,
          status: 'needs_confirmation',
          reason,
        })
        return
      }

      const canonical = toCanonicalQuantity(ingredient.amountPerServing, ingredient.unit)
      if (!canonical) {
        const reason = `Unsupported unit "${ingredient.unit}" for ${ingredient.name}.`
        quantityIssues.add(reason)
        unresolvedIngredients.push({
          menuItemId: item.id,
          ingredientName: ingredient.name,
          status: 'needs_confirmation',
          reason,
        })
        return
      }

      addIngredientRequirement(
        ingredientRequirements,
        item,
        ingredient.name,
        roundQuantity(canonical.amount * plannedServings),
        canonical.unit,
      )
    })

    const reason = quantityIssues.size > 0 ? [...quantityIssues].join(' ') : undefined
    itemAllocations.push({
      menuItemId: item.id,
      menuItemName: item.name,
      course: item.course,
      plannedServings,
      status: reason ? 'missing_quantity_data' : 'calculated',
      ...(reason ? { reason } : {}),
    })
    if (reason) unresolved.push({ menuItemId: item.id, reason })
  })

  return {
    guestCount: input.event.guestCount,
    isComplete: unresolved.length === 0,
    itemAllocations,
    ingredientRequirements: [...ingredientRequirements.values()],
    unresolved,
    unresolvedIngredients,
    assumptions: [
      ...ASSUMPTIONS,
      ...(overrides.size > 0
        ? [`Explicit serving overrides were applied to ${overrides.size} menu item(s).`]
        : []),
    ],
  }
}
