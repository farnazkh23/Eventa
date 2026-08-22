import { resolve } from 'node:path'
import { config as loadDotEnv } from 'dotenv'

const DEFAULT_MODEL = 'gemini-3.7-flash'
const DEFAULT_KICONNECT_BASE_URL = 'https://chat.kiconnect.nrw/api/v1'
const DEFAULT_KICONNECT_MODEL = 'mistralai-mistral-small-4-119b'
const DEFAULT_KICONNECT_FALLBACK_MODEL = 'gpt-oss-120b'
const DEFAULT_PORT = 8787

function positivePort(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : null
}

export function resolveServerPort(environment: NodeJS.ProcessEnv): number {
  return positivePort(environment.PORT)
    ?? positivePort(environment.EVENTA_API_PORT)
    ?? DEFAULT_PORT
}

export interface ServerConfig {
  aiProvider: 'gemini' | 'kiconnect'
  geminiApiKey: string | null
  geminiModel: string
  kiconnectApiKey: string | null
  kiconnectBaseUrl: string
  kiconnectModel: string
  kiconnectFallbackModel: string
  port: number
  frontendOrigin: string | null
  aiCacheEnabled: boolean
  aiCacheTtlMs: number
  aiCacheMaxEntries: number
}

export function loadServerConfig(): ServerConfig {
  loadDotEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true })

  const configuredProvider = process.env.AI_PROVIDER?.trim().toLocaleLowerCase('en')
  const configuredKiconnectModel = process.env.KICONNECT_MODEL?.trim()
  const configuredKiconnectFallbackModel = process.env.KICONNECT_FALLBACK_MODEL?.trim()
  const kiconnectModelAliases: Record<string, string> = {
    'mistral small 4 119b': 'mistralai-mistral-small-4-119b',
    'openai gpt oss 120b': 'gpt-oss-120b',
  }

  return {
    aiProvider: configuredProvider === 'kiconnect' ? 'kiconnect' : 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
    geminiModel: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
    kiconnectApiKey: process.env.KICONNECT_API_KEY?.trim() || null,
    kiconnectBaseUrl: process.env.KICONNECT_BASE_URL?.trim().replace(/\/$/, '') || DEFAULT_KICONNECT_BASE_URL,
    kiconnectModel: configuredKiconnectModel
      ? kiconnectModelAliases[configuredKiconnectModel.toLocaleLowerCase('en')] ?? configuredKiconnectModel
      : DEFAULT_KICONNECT_MODEL,
    kiconnectFallbackModel: configuredKiconnectFallbackModel
      ? kiconnectModelAliases[configuredKiconnectFallbackModel.toLocaleLowerCase('en')] ?? configuredKiconnectFallbackModel
      : DEFAULT_KICONNECT_FALLBACK_MODEL,
    port: resolveServerPort(process.env),
    frontendOrigin: process.env.FRONTEND_ORIGIN?.trim() || null,
    aiCacheEnabled: process.env.EVENTA_AI_CACHE_ENABLED !== 'false',
    aiCacheTtlMs: 5 * 60_000,
    aiCacheMaxEntries: 100,
  }
}
