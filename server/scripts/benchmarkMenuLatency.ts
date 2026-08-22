import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import type { EventMenu } from '../../shared/menu.js'
import { KiconnectProvider } from '../ai/kiconnectProvider.js'
import type { KiconnectAttemptEvent } from '../ai/kiconnect.js'
import { loadServerConfig } from '../config/env.js'
import { eventMenuSchema } from '../schemas/menu.js'
import { generatedMenuSchema } from '../schemas/menu.js'
import { normalizeMenu } from '../schemas/normalizeMenu.js'
import { assertMenuPlanningPolicy } from '../schemas/menuPlanningPolicy.js'

const description = 'Company summer party for 120 people in Bern, buffet, CHF 45 per guest, vegetarian options.'
const event: EventInterpretation = {
  eventType: 'corporate event', guestCount: 120, location: 'Bern', date: null, time: null,
  mealType: null, serviceStyle: 'buffet', budgetPerGuest: 45, totalBudget: null,
  dietaryRequirements: [{ type: 'vegetarian', guestCount: null }], additionalNotes: [],
}
const simulatedReviewMs = 5_000
const config = loadServerConfig()
if (!config.kiconnectApiKey) throw new Error('KICONNECT_API_KEY is not configured in .env.local')

function qualityIssues(menu: EventMenu): string[] {
  const issues: string[] = []
  if (!menu.items.some((item) => item.dietaryTags.some((tag) => /vegetarian/i.test(tag)))) {
    issues.push('No vegetarian option')
  }
  if (menu.items.flatMap((item) => item.ingredients)
    .some((ingredient) => ingredient.amountPerServing === null || ingredient.unit === null)) {
    issues.push('Missing ingredient quantity metadata')
  }
  if (!menu.planningAssumptions.some((value) => /vegetarian/i.test(value) && /confirm|unknown|specif|allocat/i.test(value))) {
    issues.push('Unknown dietary count is not transparent')
  }
  return issues
}

async function benchmark(label: string): Promise<void> {
  const attempts: KiconnectAttemptEvent[] = []
  let requestBytes = 0
  const rawContents: string[] = []
  const measuredFetch: typeof fetch = async (input, init) => {
    requestBytes += typeof init?.body === 'string' ? Buffer.byteLength(init.body) : 0
    const response = await fetch(input, init)
    try {
      const payload = await response.clone().json() as { choices?: Array<{ message?: { content?: unknown } }> }
      const content = payload.choices?.[0]?.message?.content
      if (typeof content === 'string') rawContents.push(content)
    } catch {
      // Transport diagnostics remain represented by the provider result.
    }
    return response
  }
  const provider = new KiconnectProvider(
    config.kiconnectApiKey!, config.kiconnectBaseUrl, config.kiconnectModel,
    { fetchImplementation: measuredFetch, onAttempt: (attempt) => attempts.push(attempt) },
  )
  const started = performance.now()
  const settled = provider.generate({ event, originalDescription: description })
    .then((menu) => ({ menu, error: null }))
    .catch((error: unknown) => ({ menu: null, error }))
  await new Promise((resolve) => setTimeout(resolve, simulatedReviewMs))
  const confirmedAt = performance.now()
  const result = await settled
  const completedAt = performance.now()

  console.info(JSON.stringify({
    label,
    model: config.kiconnectModel,
    success: result.menu !== null,
    rawLatencyMs: Math.round(completedAt - started),
    simulatedReviewMs,
    perceivedWaitAfterConfirmationMs: Math.round(Math.max(0, completedAt - confirmedAt)),
    modelRequests: attempts.length,
    requestBytes,
    schemaValid: result.menu ? eventMenuSchema.safeParse(result.menu).success : false,
    qualityIssues: result.menu ? qualityIssues(result.menu) : ['Generation failed'],
    rawResponseValidation: rawContents.map((content) => {
      try {
        const generated = generatedMenuSchema.parse(JSON.parse(content) as unknown)
        const menu = normalizeMenu(generated)
        assertMenuPlanningPolicy({ event, originalDescription: description }, menu)
        return 'valid'
      } catch (error) {
        return error instanceof Error ? error.message : 'unknown'
      }
    }),
    ...(result.error ? {
      error: result.error instanceof Error ? result.error.name : 'unknown',
      errorReason: result.error && typeof result.error === 'object' && 'reason' in result.error
        ? String(result.error.reason)
        : undefined,
    } : {}),
  }, null, 2))
}

await benchmark('optimized-default-reasoning')
