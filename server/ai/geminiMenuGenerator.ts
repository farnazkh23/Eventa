import { GoogleGenAI } from '@google/genai'
import type { EventMenu } from '../../shared/menu.js'
import type { MenuGenerationInput, MenuGenerator } from './menuGenerator.js'
import { generateStructuredJson, StructuredOutputValidationError } from './gemini.js'
import { generatedMenuJsonSchema, generatedMenuSchema } from '../schemas/menu.js'
import { normalizeMenu } from '../schemas/normalizeMenu.js'
import { assertMenuPlanningPolicy } from '../schemas/menuPlanningPolicy.js'
import { logDevelopmentServer } from '../observability/logger.js'

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

export class GeminiMenuGenerator implements MenuGenerator {
  private readonly client: GoogleGenAI

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly structuredJsonGenerator: typeof generateStructuredJson = generateStructuredJson,
  ) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async generate(input: MenuGenerationInput): Promise<EventMenu> {
    for (let regenerationAttempt = 1; regenerationAttempt <= 2; regenerationAttempt += 1) {
      let parsedJson: unknown
      let geminiAttempt: number

      try {
        const result = await this.structuredJsonGenerator({
          client: this.client,
          model: this.model,
          systemInstruction: MENU_GENERATION_SYSTEM_INSTRUCTION,
          contents: createMenuPromptContents(input, regenerationAttempt > 1),
          responseJsonSchema: generatedMenuJsonSchema,
          temperature: 0.35,
          endpoint: '/api/generate-menu',
          regenerationAttempt,
        })
        parsedJson = result.value
        geminiAttempt = result.geminiAttempt
      } catch (error) {
        if (!(error instanceof StructuredOutputValidationError)) throw error
        logDevelopmentServer('warn', {
          endpoint: '/api/generate-menu',
          geminiAttempt: error.geminiAttempt,
          regenerationAttempt,
          status: 200,
          errorCategory: 'structured_output_validation',
          ...(regenerationAttempt === 1 ? { retryDelayMs: 0 } : {}),
        })
        if (regenerationAttempt >= 2) throw error
        continue
      }

      try {
        const validated = generatedMenuSchema.parse(parsedJson)
        const menu = normalizeMenu(validated)
        assertMenuPlanningPolicy(input, menu, {
          allowMissingIngredientQuantities: regenerationAttempt >= 2,
        })
        return menu
      } catch {
        logDevelopmentServer('warn', {
          endpoint: '/api/generate-menu',
          geminiAttempt,
          regenerationAttempt,
          status: 200,
          errorCategory: 'structured_output_validation',
          ...(regenerationAttempt === 1 ? { retryDelayMs: 0 } : {}),
        })
        if (regenerationAttempt >= 2) throw new StructuredOutputValidationError()
      }
    }

    throw new Error('Menu corrective regeneration ended unexpectedly')
  }
}
