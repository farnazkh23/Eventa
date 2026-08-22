import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import type { EventMenu } from '../../shared/menu.js'
import { logServer } from '../observability/logger.js'
import type { AIProvider } from './aiProvider.js'
import { KiconnectApiError, KiconnectStructuredOutputError } from './kiconnect.js'
import type { MenuGenerationInput } from './menuGenerator.js'

export function isKiconnectFallbackEligible(error: unknown): error is KiconnectApiError | KiconnectStructuredOutputError {
  return error instanceof KiconnectStructuredOutputError
    || error instanceof KiconnectApiError && error.transient
}

export class KiconnectFailoverProvider implements AIProvider {
  readonly name = 'kiconnect'

  constructor(
    private readonly primary: AIProvider,
    private readonly fallback: AIProvider,
    private readonly primaryModel: string,
    private readonly fallbackModel: string,
  ) {}

  async interpret(description: string): Promise<EventInterpretation> {
    try { return await this.primary.interpret(description) }
    catch (error) {
      if (!isKiconnectFallbackEligible(error)) throw error
      this.logFallback('interpret_event', error)
      return this.fallback.interpret(description)
    }
  }

  async generate(input: MenuGenerationInput): Promise<EventMenu> {
    try { return await this.primary.generate(input) }
    catch (error) {
      if (!isKiconnectFallbackEligible(error)) throw error
      this.logFallback('generate_menu', error)
      return this.fallback.generate(input)
    }
  }

  private logFallback(operation: string, error: KiconnectApiError | KiconnectStructuredOutputError): void {
    logServer('warn', {
      provider: 'kiconnect', operation: 'provider_fallback', aiOperation: operation,
      primaryModel: this.primaryModel, fallbackModel: this.fallbackModel,
      errorCategory: error instanceof KiconnectApiError ? error.category : 'structured_output_validation',
    })
  }
}
