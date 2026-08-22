import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import type { EventMenu } from '../../shared/menu.js'
import { eventInterpretationJsonSchema, eventInterpretationSchema } from '../schemas/eventInterpretation.js'
import { generatedMenuJsonSchema, generatedMenuSchema } from '../schemas/menu.js'
import { assertMenuPlanningPolicy } from '../schemas/menuPlanningPolicy.js'
import { normalizeEventInterpretation } from '../schemas/normalizeEventInterpretation.js'
import { normalizeMenu } from '../schemas/normalizeMenu.js'
import { logDevelopmentServer } from '../observability/logger.js'
import type { AIProvider } from './aiProvider.js'
import { EVENT_INTERPRETATION_SYSTEM_INSTRUCTION } from './geminiEventInterpreter.js'
import { createMenuPromptContents, MENU_GENERATION_SYSTEM_INSTRUCTION } from './geminiMenuGenerator.js'
import { generateKiconnectStructuredJson, KiconnectApiError, KiconnectStructuredOutputError, type KiconnectAttemptEvent } from './kiconnect.js'
import type { MenuGenerationInput } from './menuGenerator.js'

interface KiconnectProviderOptions {
  fetchImplementation?: typeof fetch
  onAttempt?: (event: KiconnectAttemptEvent) => void
  allowPartialQuantityDataAfterCorrection?: boolean
}

export class KiconnectProvider implements AIProvider {
  readonly name = 'kiconnect'

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly options: KiconnectProviderOptions = {},
  ) {}

  async interpret(description: string): Promise<EventInterpretation> {
    for (let regenerationAttempt = 1; regenerationAttempt <= 2; regenerationAttempt += 1) {
      try {
        const value = await generateKiconnectStructuredJson({
          apiKey: this.apiKey, baseUrl: this.baseUrl, model: this.model,
          systemInstruction: EVENT_INTERPRETATION_SYSTEM_INSTRUCTION,
          contents: regenerationAttempt === 1 ? description : `${description}\n\nCorrection: return every required Eventa field exactly as specified by the schema, with no extra fields.`,
          responseJsonSchema: eventInterpretationJsonSchema,
          schemaName: 'event_interpretation', endpoint: '/api/interpret-event', temperature: 0.1,
          maxOutputTokens: 1_200,
          ...this.options,
        })
        return normalizeEventInterpretation(eventInterpretationSchema.parse(value))
      } catch (cause) {
        if (cause instanceof KiconnectApiError) throw cause
        logDevelopmentServer('warn', { provider: 'kiconnect', endpoint: '/api/interpret-event', operation: 'corrective_regeneration', regenerationAttempt, errorCategory: 'structured_output_validation' })
        if (regenerationAttempt >= 2) throw new KiconnectStructuredOutputError(2, cause instanceof KiconnectStructuredOutputError ? cause.reason : 'schema_validation')
      }
    }
    throw new KiconnectStructuredOutputError()
  }

  async generate(input: MenuGenerationInput): Promise<EventMenu> {
    for (let regenerationAttempt = 1; regenerationAttempt <= 2; regenerationAttempt += 1) {
      try {
        const value = await generateKiconnectStructuredJson({
          apiKey: this.apiKey, baseUrl: this.baseUrl, model: this.model,
          systemInstruction: MENU_GENERATION_SYSTEM_INSTRUCTION,
          contents: createMenuPromptContents(input, regenerationAttempt > 1),
          responseJsonSchema: generatedMenuJsonSchema,
          schemaName: 'event_menu', endpoint: '/api/generate-menu', temperature: 0.35,
          maxOutputTokens: 4_500,
          ...this.options,
        })
        const menu = normalizeMenu(generatedMenuSchema.parse(value))
        assertMenuPlanningPolicy(input, menu, {
          allowMissingIngredientQuantities:
            regenerationAttempt >= 2
            && this.options.allowPartialQuantityDataAfterCorrection === true,
        })
        return menu
      } catch (cause) {
        if (cause instanceof KiconnectApiError) throw cause
        logDevelopmentServer('warn', { provider: 'kiconnect', endpoint: '/api/generate-menu', operation: 'corrective_regeneration', regenerationAttempt, errorCategory: 'structured_output_validation' })
        if (regenerationAttempt >= 2) throw new KiconnectStructuredOutputError(2, cause instanceof KiconnectStructuredOutputError ? cause.reason : 'schema_or_policy_validation')
      }
    }
    throw new KiconnectStructuredOutputError()
  }
}
