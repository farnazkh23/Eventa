import { createServer } from 'node:http'
import { createKiconnectProvider } from '../ai/createKiconnectProvider.js'
import { handleGenerateMenu } from '../api/generateMenu.js'
import { handleInterpretEvent } from '../api/interpretEvent.js'
import { sendApiError, sendAppError } from '../api/http.js'
import { loadServerConfig } from '../config/env.js'

const description = 'Birthday dinner in Zürich for 35 guests. 4 are vegan and we want a seated dinner.'
const config = loadServerConfig()
const provider = createKiconnectProvider(config)
if (!provider) throw new Error('KICONNECT_API_KEY is not configured in .env.local')

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  try {
    if (request.method === 'POST' && url.pathname === '/api/interpret-event') {
      await handleInterpretEvent(request, response, provider)
      return
    }
    if (request.method === 'POST' && url.pathname === '/api/generate-menu') {
      await handleGenerateMenu(request, response, provider)
      return
    }
    sendApiError(response, 404, 'NOT_FOUND', 'API endpoint not found.')
  } catch (error) {
    sendAppError(response, error)
  }
})

server.requestTimeout = 300_000
server.timeout = 300_000

await new Promise<void>((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})

const address = server.address()
if (!address || typeof address === 'string') throw new Error('Could not start verification server')
const baseUrl = `http://127.0.0.1:${address.port}`

try {
  for (let run = 1; run <= 3; run += 1) {
    const startedAt = Date.now()
    const interpretationResponse = await fetch(`${baseUrl}/api/interpret-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    })
    if (!interpretationResponse.ok) {
      throw new Error(`Flow ${run}: interpretation returned HTTP ${interpretationResponse.status}`)
    }
    const event = await interpretationResponse.json() as unknown

    const menuResponse = await fetch(`${baseUrl}/api/generate-menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, originalDescription: description }),
    })
    if (!menuResponse.ok) {
      throw new Error(`Flow ${run}: menu generation returned HTTP ${menuResponse.status}`)
    }
    const menu = await menuResponse.json() as { items?: unknown[] }
    console.info(
      `flow=${run} interpretation=200 menu=200 items=${menu.items?.length ?? 0} elapsedMs=${Date.now() - startedAt}`,
    )
  }
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()))
}
