import { createHash } from 'node:crypto'
import type { EventInterpretation } from '../../shared/eventInterpretation.js'
import type { EventMenu } from '../../shared/menu.js'
import { TtlCache } from '../cache/ttlCache.js'
import { logServer } from '../observability/logger.js'
import type { EventInterpreter } from './eventInterpreter.js'
import type { MenuGenerationInput, MenuGenerator } from './menuGenerator.js'

export interface AIProvider extends EventInterpreter, MenuGenerator {
  readonly name: string
}

function normalizedHash(operation: string, input: unknown): string {
  return createHash('sha256').update(`${operation}:${JSON.stringify(input)}`).digest('hex')
}

export class CachedDeduplicatingAIProvider implements AIProvider {
  readonly name: string
  private readonly cache: TtlCache<EventInterpretation | EventMenu> | null
  private readonly inFlight = new Map<string, Promise<EventInterpretation | EventMenu>>()

  constructor(private readonly provider: AIProvider, options: { enabled: boolean; ttlMs: number; maxEntries: number }) {
    this.name = provider.name
    this.cache = options.enabled ? new TtlCache(options.maxEntries, options.ttlMs) : null
  }

  interpret(description: string): Promise<EventInterpretation> {
    return this.run('interpret_event', { description: description.trim() }, () => this.provider.interpret(description))
  }

  generate(input: MenuGenerationInput): Promise<EventMenu> {
    return this.run('generate_menu', input, () => this.provider.generate(input))
  }

  private run<T extends EventInterpretation | EventMenu>(operation: string, input: unknown, work: () => Promise<T>): Promise<T> {
    const key = normalizedHash(operation, input)
    const cached = this.cache?.get(key) as T | undefined
    if (cached) {
      logServer('info', { operation, cache: 'hit' })
      return Promise.resolve(cached)
    }
    const existing = this.inFlight.get(key) as Promise<T> | undefined
    if (existing) {
      logServer('info', { operation, cache: 'deduplicated' })
      return existing
    }
    logServer('info', { operation, cache: this.cache ? 'miss' : 'disabled' })
    const pending = work().then((value) => {
      this.cache?.set(key, value)
      return value
    }).finally(() => this.inFlight.delete(key))
    this.inFlight.set(key, pending)
    return pending
  }
}
