import { z } from 'zod'
import type { InterpretEventRequest } from '../../shared/eventInterpretation'
import type { PlanningEventInterpretation } from '../domain/planning'
import { getApiUrl } from './apiUrl'

const responseSchema = z.object({
  eventType: z.string().nullable(),
  guestCount: z.number().int().positive().nullable(),
  location: z.string().nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  mealType: z.string().nullable(),
  serviceStyle: z.string().nullable(),
  budgetPerGuest: z.number().nonnegative().nullable(),
  totalBudget: z.number().nonnegative().nullable(),
  dietaryRequirements: z.array(z.object({
    type: z.string().min(1),
    guestCount: z.number().int().nonnegative().nullable(),
  })),
  additionalNotes: z.array(z.string()),
})

export class InterpretEventServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InterpretEventServiceError'
  }
}

export async function interpretEvent(
  description: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<PlanningEventInterpretation> {
  const request: InterpretEventRequest = { description }
  let response: Response

  try {
    response = await fetchImplementation(getApiUrl('/api/interpret-event'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch {
    throw new InterpretEventServiceError('Eventa could not reach the AI service. Please try again.')
  }

  if (!response.ok) {
    const message = response.status === 400
      ? 'Please check your event description and try again.'
      : 'Eventa’s AI service is unavailable. Please try again.'
    throw new InterpretEventServiceError(message)
  }

  try {
    return responseSchema.parse(await response.json())
  } catch {
    throw new InterpretEventServiceError('Eventa received an invalid response. Please try again.')
  }
}
