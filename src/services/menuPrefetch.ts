import type { EventInterpretation } from '../../shared/eventInterpretation'
import type { EventMenu } from '../../shared/menu'
import {
  createGenerateMenuRequest,
  generateMenuRequest,
  generateMenuRequestKey,
} from './generateMenu'

const PREFETCH_TTL_MS = 5 * 60_000

interface PrefetchEntry {
  createdAt: number
  promise: Promise<EventMenu>
}

/** Shares review-time work only when the confirmed Eventa request is unchanged. */
export class MenuPrefetch {
  private readonly entries = new Map<string, PrefetchEntry>()

  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  request(event: EventInterpretation, originalDescription: string): Promise<EventMenu> {
    this.prune()
    const request = createGenerateMenuRequest(event, originalDescription)
    const key = generateMenuRequestKey(request)
    const existing = this.entries.get(key)
    if (existing) return existing.promise

    const promise = generateMenuRequest(request, this.fetchImplementation)
    this.entries.set(key, { createdAt: this.now(), promise })
    void promise.catch(() => {
      if (this.entries.get(key)?.promise === promise) this.entries.delete(key)
    })
    return promise
  }

  private prune(): void {
    const oldestAllowed = this.now() - PREFETCH_TTL_MS
    for (const [key, entry] of this.entries) {
      if (entry.createdAt < oldestAllowed) this.entries.delete(key)
    }
  }
}
