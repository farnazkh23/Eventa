import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { CachedDeduplicatingAIProvider, type AIProvider } from './ai/aiProvider.js'
import { GeminiProvider } from './ai/geminiProvider.js'
import { handleCalculateQuantities } from './api/calculateQuantities.js'
import { handleGenerateMenu } from './api/generateMenu.js'
import { sendAppError, sendJson } from './api/http.js'
import { handleInterpretEvent } from './api/interpretEvent.js'
import { loadServerConfig } from './config/env.js'
import { AppError } from './errors/appError.js'
import { logServer, withRequestContext } from './observability/logger.js'

const config = loadServerConfig()
const provider: AIProvider | null = config.geminiApiKey
  ? new CachedDeduplicatingAIProvider(new GeminiProvider(config.geminiApiKey, config.geminiModel), {
      enabled: config.aiCacheEnabled,
      ttlMs: config.aiCacheTtlMs,
      maxEntries: config.aiCacheMaxEntries,
    })
  : null

const server = createServer(async (request, response) => {
  const requestId = request.headers['x-request-id']?.toString().slice(0, 100) || randomUUID()
  response.setHeader('X-Request-Id', requestId)
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const started = performance.now()
  let operation = 'not_found'
  await withRequestContext({ requestId, endpoint: url.pathname }, async () => { try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      operation = 'health'
      sendJson(response, 200, { status: 'ok', version: process.env.npm_package_version ?? '0.1.0', aiConfigured: provider !== null })
      return
    }
    if (request.method === 'POST' && url.pathname === '/api/interpret-event') {
      operation = 'interpret_event'; await handleInterpretEvent(request, response, provider); return
    }
    if (request.method === 'POST' && url.pathname === '/api/generate-menu') {
      operation = 'generate_menu'; await handleGenerateMenu(request, response, provider); return
    }
    if (request.method === 'POST' && url.pathname === '/api/calculate-quantities') {
      operation = 'calculate_quantities'; await handleCalculateQuantities(request, response); return
    }
    throw new AppError('NOT_FOUND')
  } catch (error) {
    const appError = sendAppError(response, error)
    logServer('error', { requestId, endpoint: url.pathname, operation, status: appError.status, errorCategory: appError.code })
  } finally {
    const durationMs = Math.round(performance.now() - started)
    if (!response.headersSent) response.setHeader('Server-Timing', `eventa;dur=${durationMs}`)
    logServer('info', { requestId, endpoint: url.pathname, operation, status: response.statusCode, durationMs })
  } })
})

server.requestTimeout = 300_000
server.timeout = 300_000
server.listen(config.port, '127.0.0.1', () => {
  logServer('info', { operation: 'server_started', status: 200, port: config.port, aiConfigured: provider !== null })
})

function shutdown() { server.close(() => process.exit(0)) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
