import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import type { EventMenu } from '../../shared/menu.js'
import type { AIProvider } from './aiProvider.js'
import { GeminiEventInterpreter } from './geminiEventInterpreter.js'
import { GeminiMenuGenerator } from './geminiMenuGenerator.js'
import type { MenuGenerationInput } from './menuGenerator.js'

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini'
  private readonly interpreter: GeminiEventInterpreter
  private readonly menuGenerator: GeminiMenuGenerator

  constructor(apiKey: string, model: string) {
    this.interpreter = new GeminiEventInterpreter(apiKey, model)
    this.menuGenerator = new GeminiMenuGenerator(apiKey, model)
  }

  interpret(description: string): Promise<EventInterpretation> { return this.interpreter.interpret(description) }
  generate(input: MenuGenerationInput): Promise<EventMenu> { return this.menuGenerator.generate(input) }
}
