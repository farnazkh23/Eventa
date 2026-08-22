import { GoogleGenAI } from '@google/genai'
import type { EventMenu } from '../../shared/menu.js'
import type { MenuGenerationInput, MenuGenerator } from './menuGenerator.js'
import { generateStructuredJson } from './gemini.js'
import { generatedMenuJsonSchema, generatedMenuSchema } from '../schemas/menu.js'
import { normalizeMenu } from '../schemas/normalizeMenu.js'
import { assertNoDerivedPlanningNumbers } from '../schemas/menuPlanningPolicy.js'

const SYSTEM_INSTRUCTION = `You are Eventa's professional catering menu planner.
Create a realistic, concise catering menu appropriate for the confirmed event facts supplied by Eventa.
Use event type, guest count, location, meal type, service style, dietary requirements, known budget level, and additional requirements when they are present.
Do not invent event facts. Menu choices, portions, and ingredient amounts are planning recommendations, not facts.
Do not produce recipes, cooking instructions, total quantities, package counts, prices, shopping lists, or specific Transgourmet products.
Keep ingredient names concise, generic, and suitable for later catalogue matching.
Portion and ingredient amounts must be per-serving recommendations only. Never multiply them by guest count.
Respect every dietary requirement with a suitable menu item or an all-guest menu choice.
If a dietary guest count is unknown, do not guess it. Use servingScope "dietary_option" for the option and add a transparent planning assumption that allocation will be confirmed during quantity planning.
If a dietary count is explicitly supported by the original description or additional notes, it may be acknowledged in planningAssumptions without calculating purchase quantities.
Never subtract a dietary guest count from the total guest count. Never state or derive a number of standard meals, portions, dishes, packages, or allocations. For example, if 4 vegan guests are stated among 35 guests, acknowledge only the supported count of 4 vegan guests and defer every allocation to quantity planning.
Keep the menu materially tailored to the event rather than returning a generic default menu.`

export class GeminiMenuGenerator implements MenuGenerator {
  private readonly client: GoogleGenAI

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async generate(input: MenuGenerationInput): Promise<EventMenu> {
    for (let attempt = 0; ; attempt += 1) {
      const parsedJson = await generateStructuredJson({
        client: this.client,
        model: this.model,
        systemInstruction: SYSTEM_INSTRUCTION,
        contents: JSON.stringify({
          confirmedEvent: input.event,
          originalDescription: input.originalDescription ?? null,
          ...(attempt > 0
            ? { correction: 'The previous proposal contained a derived numeric allocation. Regenerate without arithmetic or derived subgroup counts in planningAssumptions.' }
            : {}),
        }),
        responseJsonSchema: generatedMenuJsonSchema,
        temperature: 0.35,
      })

      const validated = generatedMenuSchema.parse(parsedJson)
      const menu = normalizeMenu(validated)

      try {
        assertNoDerivedPlanningNumbers(input, menu)
        return menu
      } catch (error) {
        if (attempt >= 1) throw error
      }
    }
  }
}
