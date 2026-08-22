import type { MenuGenerationInput } from '../ai/menuGenerator.js'
import type { EventMenu } from '../../shared/menu.js'

function extractNumbers(value: string): Set<string> {
  return new Set(
    [...value.matchAll(/\b\d+(?:[.,]\d+)?\b/g)].map((match) => match[0].replace(',', '.')),
  )
}

export function assertNoDerivedPlanningNumbers(
  input: MenuGenerationInput,
  menu: EventMenu,
): void {
  const supportedNumbers = extractNumbers(JSON.stringify(input))
  const assumptionNumbers = extractNumbers(menu.planningAssumptions.join(' '))
  const derivedNumbers = [...assumptionNumbers].filter((number) => !supportedNumbers.has(number))

  if (derivedNumbers.length > 0) {
    throw new Error('Menu planning assumptions contain derived numeric allocations')
  }
}
