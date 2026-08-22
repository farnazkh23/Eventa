import { z } from 'zod'
import type { EventInterpretation } from '../../shared/eventInterpretation'
import { menuCourses, type EventMenu, type GenerateMenuRequest } from '../../shared/menu'

const menuSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  items: z.array(z.object({
    id: z.string().min(1),
    course: z.enum(menuCourses),
    name: z.string().min(1),
    description: z.string().min(1),
    dietaryTags: z.array(z.string()),
    portion: z.object({
      amount: z.number().positive(),
      unit: z.string().min(1),
    }).nullable(),
    ingredients: z.array(z.object({
      name: z.string().min(1),
      amountPerServing: z.number().positive().nullable(),
      unit: z.string().min(1).nullable(),
    })),
    servingScope: z.enum(['all_guests', 'dietary_option', 'shared']),
  })).min(2),
  planningAssumptions: z.array(z.string()),
})

export class GenerateMenuServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GenerateMenuServiceError'
  }
}

export async function generateMenu(
  event: EventInterpretation,
  originalDescription: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<EventMenu> {
  const request: GenerateMenuRequest = {
    event,
    ...(originalDescription.trim() ? { originalDescription } : {}),
  }

  let response: Response
  try {
    response = await fetchImplementation('/api/generate-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch {
    throw new GenerateMenuServiceError('Eventa could not reach the menu service. Please try again.')
  }

  if (!response.ok) {
    const message = response.status === 400
      ? 'Please review the confirmed event details and try again.'
      : 'Eventa could not create the menu. Please try again.'
    throw new GenerateMenuServiceError(message)
  }

  try {
    return menuSchema.parse(await response.json())
  } catch {
    throw new GenerateMenuServiceError('Eventa received an invalid menu. Please try again.')
  }
}
