import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MenuGenerator } from '../ai/menuGenerator.js'
import { generateMenuRequestSchema } from '../schemas/menu.js'
import { readJsonBody, sendApiError, sendJson } from './http.js'

export async function handleGenerateMenu(
  request: IncomingMessage,
  response: ServerResponse,
  generator: MenuGenerator | null,
): Promise<void> {
  if (!generator) {
    sendApiError(response, 503, 'AI_NOT_CONFIGURED', 'Eventa’s menu service is unavailable. Please try again.')
    return
  }

  let body: unknown

  try {
    body = await readJsonBody(request)
  } catch {
    sendApiError(response, 400, 'INVALID_REQUEST', 'Please confirm valid event details.')
    return
  }

  const validation = generateMenuRequestSchema.safeParse(body)
  if (!validation.success) {
    sendApiError(response, 400, 'INVALID_REQUEST', 'Please confirm valid event details.')
    return
  }

  try {
    const menu = await generator.generate(validation.data)
    sendJson(response, 200, menu)
  } catch {
    sendApiError(response, 503, 'MENU_UNAVAILABLE', 'Eventa could not create the menu. Please try again.')
  }
}
