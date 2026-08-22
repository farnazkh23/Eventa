import type { EventInterpretation } from '../../shared/eventInterpretation.js'

export interface EventInterpreter {
  interpret(description: string): Promise<EventInterpretation>
}
