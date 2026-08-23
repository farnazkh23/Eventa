import type { MenuGenerationInput } from './menuGenerator.js'

export const MENU_GENERATION_SYSTEM_INSTRUCTION = `You are Eventa's professional catering menu planner. Create a concise, realistic menu tailored only to supplied confirmed event facts. Choices and per-serving quantities are recommendations.
Return {title, summary, items, planningAssumptions}. Each item needs {course, name, description, dietaryTags, portion, ingredients, servingScope, dietaryAllocationType}; each ingredient needs {name, amountPerServing, unit}.
Never output recipes, instructions, event totals, derived allocations, packs, prices, shopping lists, or branded products. Use concise generic ingredient names. Every quantifiable ingredient, including beverages, needs a positive per-serving amount and exactly one unit: g, kg, ml, l, or piece. Use null amount/unit only when genuinely unquantifiable. Never multiply by guest count.
Respect every dietary requirement with a compatible choice. Dietary properties belong in dietaryTags, not course: vegetarian/vegan mains use course "main". A genuine dietary substitute uses servingScope "dietary_option" and dietaryAllocationType equal to exactly one confirmed requirement. All compatibility remains in dietaryTags. Ordinary sides use all_guests/shared. Other items use dietaryAllocationType null.
When dietary main alternatives exist, the standard main must be all_guests, never shared. Never subtract dietary counts or derive standard servings. Known dietary counts may guide the option; unknown counts must never be guessed and require a transparent confirmation note in planningAssumptions. Keep the result materially event-specific.`

function compactConfirmedEvent(input: MenuGenerationInput): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input.event).filter(([, value]) =>
    value !== null && (!Array.isArray(value) || value.length > 0)))
}

export function createMenuPromptContents(
  input: MenuGenerationInput,
  correctiveRegeneration: boolean,
): string {
  return JSON.stringify({
    event: compactConfirmedEvent(input),
    ...(correctiveRegeneration
      ? { correction: 'Fix all schema/policy violations: quantities/units, dietary allocation type and scopes, main coverage, course semantics, and no derived totals.' }
      : {}),
  })
}
