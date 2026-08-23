import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { CachedDeduplicatingAIProvider, type AIProvider } from './ai/aiProvider.js'
import { createKiconnectProvider } from './ai/createKiconnectProvider.js'
import { handleCalculateQuantities } from './api/calculateQuantities.js'
import { handleCreatePurchasingPlan } from './api/createPurchasingPlan.js'
import { handleGenerateMenu } from './api/generateMenu.js'
import { sendAppError, sendJson } from './api/http.js'
import { handleInterpretEvent } from './api/interpretEvent.js'
import { handleMatchProducts } from './api/matchProducts.js'
import { loadServerConfig } from './config/env.js'
import { corsResponseHeaders } from './cors.js'
import { AppError } from './errors/appError.js'
import { logServer, withRequestContext } from './observability/logger.js'

const config = loadServerConfig()
const baseProvider: AIProvider | null = createKiconnectProvider(config)
const provider: AIProvider | null = baseProvider
  ? new CachedDeduplicatingAIProvider(baseProvider, {
      enabled: config.aiCacheEnabled,
      ttlMs: config.aiCacheTtlMs,
      maxEntries: config.aiCacheMaxEntries,
    })
  : null

const server = createServer(async (request, response) => {
  const requestId = request.headers['x-request-id']?.toString().slice(0, 100) || randomUUID()
  response.setHeader('X-Request-Id', requestId)
  const corsHeaders = corsResponseHeaders(request.headers.origin, config.frontendOrigin)
  for (const [header, value] of Object.entries(corsHeaders)) response.setHeader(header, value)
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const started = performance.now()
  let operation = 'not_found'
  await withRequestContext({ requestId, endpoint: url.pathname }, async () => { try {
    if (request.method === 'OPTIONS') {
      operation = 'cors_preflight'
      response.writeHead(204)
      response.end()
      return
    }
    if (request.method === 'GET' && url.pathname === '/api/health') {
      operation = 'health'
      sendJson(response, 200, { status: 'ok', version: process.env.npm_package_version ?? '0.1.0', aiConfigured: provider !== null, aiProvider: 'kiconnect' })
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
    if (request.method === 'POST' && url.pathname === '/api/match-products') {
      operation = 'match_products'; await handleMatchProducts(request, response); return
    }
    if (request.method === 'POST' && url.pathname === '/api/create-purchasing-plan') {
      operation = 'create_purchasing_plan'; await handleCreatePurchasingPlan(request, response); return
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
server.listen(config.port, '0.0.0.0', () => {
  logServer('info', { operation: 'server_started', status: 200, host: '0.0.0.0', port: config.port, aiConfigured: provider !== null, aiProvider: 'kiconnect' })
})

function shutdown() { server.close(() => process.exit(0)) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
