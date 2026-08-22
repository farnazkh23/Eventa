import { createServer } from 'node:http'
import { GeminiEventInterpreter } from './ai/geminiEventInterpreter.js'
import type { EventInterpreter } from './ai/eventInterpreter.js'
import { GeminiMenuGenerator } from './ai/geminiMenuGenerator.js'
import type { MenuGenerator } from './ai/menuGenerator.js'
import { handleGenerateMenu } from './api/generateMenu.js'
import { handleInterpretEvent } from './api/interpretEvent.js'
import { handleCalculateQuantities } from './api/calculateQuantities.js'
import { sendApiError } from './api/http.js'
import { loadServerConfig } from './config/env.js'

const config = loadServerConfig()
const interpreter: EventInterpreter | null = config.geminiApiKey
  ? new GeminiEventInterpreter(config.geminiApiKey, config.geminiModel)
  : null
const menuGenerator: MenuGenerator | null = config.geminiApiKey
  ? new GeminiMenuGenerator(config.geminiApiKey, config.geminiModel)
  : null

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (request.method === 'POST' && url.pathname === '/api/interpret-event') {
    await handleInterpretEvent(request, response, interpreter)
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/generate-menu') {
    await handleGenerateMenu(request, response, menuGenerator)
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/calculate-quantities') {
    await handleCalculateQuantities(request, response)
    return
  }

  sendApiError(response, 404, 'NOT_FOUND', 'API endpoint not found.')
})

server.listen(config.port, '127.0.0.1', () => {
  console.info(`Eventa API listening on http://127.0.0.1:${config.port}`)
  if (!interpreter) console.warn('Gemini is not configured. Set GEMINI_API_KEY in .env.local.')
})

function shutdown() {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
