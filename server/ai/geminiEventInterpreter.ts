import { ApiError, GoogleGenAI } from '@google/genai'
import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import type { EventInterpreter } from './eventInterpreter.js'
import {
  eventInterpretationJsonSchema,
  eventInterpretationSchema,
} from '../schemas/eventInterpretation.js'
import { normalizeEventInterpretation } from '../schemas/normalizeEventInterpretation.js'

const SYSTEM_INSTRUCTION = `You are Eventa's event and catering brief extractor.
Extract only facts supported by the user's description. Never infer or invent missing facts.
Use null for every missing scalar field and [] for every missing list field.
Return currency amounts as numeric CHF values without currency symbols.
Use a numeric guestCount only when the description states a count. For approximate counts such as "around 80", use 80 and record the approximation in additionalNotes.
Keep location natural and human-readable.
Normalize dietaryRequirements to concise lowercase terms such as "vegetarian", "vegan", and "gluten-free".
Put relevant requirements that do not fit another field into additionalNotes.
Do not provide advice, menus, quantities, product recommendations, calculations, or conversational text.`

const MAX_TRANSIENT_RETRIES = 2

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export class GeminiEventInterpreter implements EventInterpreter {
  private readonly client: GoogleGenAI

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async interpret(description: string): Promise<EventInterpretation> {
    let response

    for (let attempt = 0; ; attempt += 1) {
      try {
        response = await this.client.models.generateContent({
          model: this.model,
          contents: description,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseJsonSchema: eventInterpretationJsonSchema,
          },
        })
        break
      } catch (error) {
        const isTransient = error instanceof ApiError && (error.status === 429 || error.status === 503)
        if (!isTransient || attempt >= MAX_TRANSIENT_RETRIES) throw error
        await delay(500 * 2 ** attempt)
      }
    }

    if (!response.text) {
      throw new Error('Gemini returned an empty structured response')
    }

    const parsedJson: unknown = JSON.parse(response.text)
    const validated = eventInterpretationSchema.parse(parsedJson)
    return normalizeEventInterpretation(validated)
  }
}
