import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import type { EventMenu } from '../../shared/menu.js'
import { loadServerConfig } from '../config/env.js'
import { eventInterpretationSchema } from '../schemas/eventInterpretation.js'
import { eventMenuSchema } from '../schemas/menu.js'
import { KiconnectProvider } from '../ai/kiconnectProvider.js'
import type { KiconnectAttemptEvent } from '../ai/kiconnect.js'

const description = 'Company summer party for 120 people in Bern, buffet, CHF 45 per guest, vegetarian options.'
const confirmedEvent: EventInterpretation = {
  eventType: 'corporate event', guestCount: 120, location: 'Bern', date: null, time: null,
  mealType: null, serviceStyle: 'buffet', budgetPerGuest: 45, totalBudget: null,
  dietaryRequirements: [{ type: 'vegetarian', guestCount: null }], additionalNotes: [],
}
const models = ['mistralai-mistral-small-4-119b', 'gpt-oss-120b'] as const
const config = loadServerConfig()
if (!config.kiconnectApiKey) throw new Error('KICONNECT_API_KEY is not configured in .env.local')

function qualityIssues(menu: EventMenu): string[] {
  const issues: string[] = []
  const vegetarianOption = menu.items.some((item) => item.course === 'vegetarian' || item.course === 'vegan' || item.dietaryTags.some((tag) => /vegetarian|vegan/i.test(tag)))
  if (!vegetarianOption) issues.push('No clearly identified vegetarian option.')
  const transparentUnknownCount = menu.planningAssumptions.some((assumption) => /vegetarian/i.test(assumption) && /not specified|unspecified|confirm|allocat|unknown/i.test(assumption))
  if (!transparentUnknownCount) issues.push('Unknown vegetarian guest count is not stated transparently in planning assumptions.')
  const missingQuantityCount = menu.items.flatMap(({ ingredients }) => ingredients).filter((ingredient) => ingredient.amountPerServing === null || ingredient.unit === null).length
  if (missingQuantityCount > 0) {
    issues.push(`${missingQuantityCount} ingredients lack a per-serving amount or unit.`)
  }
  if (menu.items.length < 3) issues.push('Menu is unusually narrow for a catered buffet.')
  return issues
}

function interpretationQualityIssues(event: EventInterpretation): string[] {
  const issues: string[] = []
  if (event.serviceStyle?.toLocaleLowerCase('en') !== 'buffet') issues.push('Buffet was not mapped to serviceStyle.')
  if (event.mealType?.toLocaleLowerCase('en') === 'buffet') issues.push('Buffet was incorrectly duplicated into mealType.')
  if (event.totalBudget !== null) issues.push('A total budget was derived even though the prompt stated only a per-guest budget.')
  return issues
}

for (const model of models) {
  const attempts: KiconnectAttemptEvent[] = []
  const provider = new KiconnectProvider(config.kiconnectApiKey, config.kiconnectBaseUrl, model, { onAttempt: (event) => attempts.push(event) })
  const report: Record<string, unknown> = { model, interpretation: {}, menuGeneration: {} }

  const interpretationStarted = performance.now()
  try {
    const interpretation = await provider.interpret(description)
    report.interpretation = {
      success: true, latencyMs: Math.round(performance.now() - interpretationStarted),
      schemaValid: eventInterpretationSchema.safeParse(interpretation).success,
      qualityIssues: interpretationQualityIssues(interpretation),
      retriesRequired: Math.max(0, attempts.filter(({ endpoint }) => endpoint === '/api/interpret-event').length - 1),
      result: interpretation,
    }
  } catch (error) {
    report.interpretation = {
      success: false, latencyMs: Math.round(performance.now() - interpretationStarted), schemaValid: false,
      retriesRequired: Math.max(0, attempts.filter(({ endpoint }) => endpoint === '/api/interpret-event').length - 1),
      error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    }
  }

  const menuStarted = performance.now()
  try {
    const menu = await provider.generate({ event: confirmedEvent, originalDescription: description })
    report.menuGeneration = {
      success: true, latencyMs: Math.round(performance.now() - menuStarted),
      schemaValid: eventMenuSchema.safeParse(menu).success,
      retriesRequired: Math.max(0, attempts.filter(({ endpoint }) => endpoint === '/api/generate-menu').length - 1),
      qualityIssues: qualityIssues(menu), title: menu.title,
      items: menu.items.map(({ course, name, servingScope }) => ({ course, name, servingScope })),
      planningAssumptions: menu.planningAssumptions,
    }
  } catch (error) {
    report.menuGeneration = {
      success: false, latencyMs: Math.round(performance.now() - menuStarted), schemaValid: false,
      retriesRequired: Math.max(0, attempts.filter(({ endpoint }) => endpoint === '/api/generate-menu').length - 1),
      qualityIssues: ['Menu generation failed.'], error: error instanceof Error ? { name: error.name, message: error.message } : 'unknown',
    }
  }
  console.info(JSON.stringify(report, null, 2))
}

console.info(JSON.stringify({
  finalPolicy: {
    primaryModel: 'mistralai-mistral-small-4-119b',
    fallbackModel: 'gpt-oss-120b',
    fallbackOn: ['exhausted transient transport failure', 'schema or policy failure after corrective regeneration'],
    noFallbackOn: ['authentication/configuration error', 'permanent request error'],
  },
}, null, 2))
