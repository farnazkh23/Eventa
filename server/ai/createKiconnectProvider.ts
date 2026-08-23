import type { ServerConfig } from '../config/env.js'
import type { AIProvider } from './aiProvider.js'
import { KiconnectFailoverProvider } from './kiconnectFailoverProvider.js'
import { KiconnectProvider } from './kiconnectProvider.js'

type KiconnectConfig = Pick<
  ServerConfig,
  'kiconnectApiKey' | 'kiconnectBaseUrl' | 'kiconnectModel' | 'kiconnectFallbackModel'
>

export function createKiconnectProvider(config: KiconnectConfig): AIProvider | null {
  if (!config.kiconnectApiKey) return null

  return new KiconnectFailoverProvider(
    new KiconnectProvider(config.kiconnectApiKey, config.kiconnectBaseUrl, config.kiconnectModel),
    new KiconnectProvider(
      config.kiconnectApiKey,
      config.kiconnectBaseUrl,
      config.kiconnectFallbackModel,
      { allowPartialQuantityDataAfterCorrection: true },
    ),
    config.kiconnectModel,
    config.kiconnectFallbackModel,
  )
}
