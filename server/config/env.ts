import { resolve } from 'node:path'
import { config as loadDotEnv } from 'dotenv'

const DEFAULT_MODEL = 'gemini-3.7-flash'
const DEFAULT_PORT = 8787

export interface ServerConfig {
  geminiApiKey: string | null
  geminiModel: string
  port: number
  aiCacheEnabled: boolean
  aiCacheTtlMs: number
  aiCacheMaxEntries: number
}

export function loadServerConfig(): ServerConfig {
  loadDotEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true })

  const parsedPort = Number.parseInt(process.env.EVENTA_API_PORT ?? '', 10)

  return {
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
    geminiModel: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
    port: Number.isSafeInteger(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_PORT,
    aiCacheEnabled: process.env.EVENTA_AI_CACHE_ENABLED !== 'false',
    aiCacheTtlMs: 5 * 60_000,
    aiCacheMaxEntries: 100,
  }
}
