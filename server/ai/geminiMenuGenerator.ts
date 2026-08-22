import { GoogleGenAI } from '@google/genai'
import type { EventMenu } from '../../shared/menu.js'
import type { MenuGenerationInput, MenuGenerator } from './menuGenerator.js'
import { generateStructuredJson, StructuredOutputValidationError } from './gemini.js'
import { generatedMenuJsonSchema, generatedMenuSchema } from '../schemas/menu.js'
import { normalizeMenu } from '../schemas/normalizeMenu.js'
import { assertMenuPlanningPolicy } from '../schemas/menuPlanningPolicy.js'
import { logDevelopmentServer } from '../observability/logger.js'

export const MENU_GENERATION_SYSTEM_INSTRUCTION = `You are Eventa's professional catering menu planner.
Create a realistic, concise catering menu appropriate for the confirmed event facts supplied by Eventa.
Use event type, guest count, location, meal type, service style, dietary requirements, known budget level, and additional requirements when they are present.
Do not invent event facts. Menu choices, portions, and ingredient amounts are planning recommendations, not facts.
Do not produce recipes, cooking instructions, total quantities, package counts, prices, shopping lists, or specific Transgourmet products.
Keep ingredient names concise, generic, and suitable for later catalogue matching.
Portion and ingredient amounts must be per-serving recommendations only. Never multiply them by guest count.
Every ingredient that contributes to deterministic purchasing quantities must include a positive amountPerServing and exactly one supported unit: g, kg, ml, l, or piece. Do not omit beverage quantities. Use null only when an ingredient genuinely cannot be quantified, and prefer a quantifiable menu description instead.
Respect every dietary requirement with a suitable menu item or an all-guest menu choice.
When the menu includes main courses, provide a compatible main-course choice for every confirmed dietary requirement. If other main courses are not compatible, mark the dedicated alternative as servingScope "dietary_option"; never label a named vegetarian, vegan, or gluten-free alternative "all_guests" unless every guest is intended to receive it.
The course field describes the item's meal position, never its dietary audience. A vegetarian or vegan main uses course "main" plus the relevant dietaryTags and servingScope. A vegan dessert uses course "dessert", and a dietary beverage uses course "beverage".
Read each dietary requirement's guestCount from the confirmed event. If it is null, do not guess it. Use servingScope "dietary_option" for the option and add a transparent planning assumption that allocation will be confirmed during quantity planning.
If a dietary requirement has a non-null guestCount, use that exact supported count when tailoring the menu and optionally acknowledge it in planningAssumptions, without calculating purchase quantities or any other guest-group allocation.
Never subtract a dietary guest count from the total guest count. Never state or derive a number of standard meals, portions, dishes, packages, or allocations. For example, if 4 vegan guests are stated among 35 guests, acknowledge only the supported count of 4 vegan guests and defer every allocation to quantity planning.
Keep the menu materially tailored to the event rather than returning a generic default menu.`

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
          contents: JSON.stringify({
            confirmedEvent: input.event,
            originalDescription: input.originalDescription ?? null,
            ...(regenerationAttempt > 1
              ? { correction: 'The previous proposal did not satisfy Eventa\'s validated menu contract. Regenerate it with positive per-serving quantities and supported units for every quantifiable ingredient, correct dietary_option scopes and dietary main-course coverage, course values that describe meal position, no event totals, and no derived allocations.' }
              : {}),
          }),
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
