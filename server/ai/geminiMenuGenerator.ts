import { GoogleGenAI } from '@google/genai'
import type { EventMenu } from '../../shared/menu.js'
import type { MenuGenerationInput, MenuGenerator } from './menuGenerator.js'
import { generateStructuredJson, StructuredOutputValidationError } from './gemini.js'
import { generatedMenuJsonSchema, generatedMenuSchema } from '../schemas/menu.js'
import { normalizeMenu } from '../schemas/normalizeMenu.js'
import { assertNoDerivedPlanningNumbers } from '../schemas/menuPlanningPolicy.js'
import { logDevelopmentServer } from '../observability/logger.js'

const SYSTEM_INSTRUCTION = `You are Eventa's professional catering menu planner.
Create a realistic, concise catering menu appropriate for the confirmed event facts supplied by Eventa.
Use event type, guest count, location, meal type, service style, dietary requirements, known budget level, and additional requirements when they are present.
Do not invent event facts. Menu choices, portions, and ingredient amounts are planning recommendations, not facts.
Do not produce recipes, cooking instructions, total quantities, package counts, prices, shopping lists, or specific Transgourmet products.
Keep ingredient names concise, generic, and suitable for later catalogue matching.
Portion and ingredient amounts must be per-serving recommendations only. Never multiply them by guest count.
Respect every dietary requirement with a suitable menu item or an all-guest menu choice.
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
          systemInstruction: SYSTEM_INSTRUCTION,
          contents: JSON.stringify({
            confirmedEvent: input.event,
            originalDescription: input.originalDescription ?? null,
            ...(regenerationAttempt > 1
              ? { correction: 'The previous proposal did not satisfy Eventa\'s validated menu contract. Regenerate a clean menu without derived allocations and follow the response schema exactly.' }
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
        assertNoDerivedPlanningNumbers(input, menu)
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
