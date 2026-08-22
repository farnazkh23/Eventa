import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import type { EventMenu } from '../../shared/menu.js'

export interface MenuGenerationInput {
  event: EventInterpretation
  originalDescription?: string
}

export interface MenuGenerator {
  generate(input: MenuGenerationInput): Promise<EventMenu>
}
