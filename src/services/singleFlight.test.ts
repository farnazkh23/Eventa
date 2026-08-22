import { describe, expect, it, vi } from 'vitest'
import { SingleFlight } from './singleFlight'

describe('SingleFlight', () => {
  it('shares one request across concurrent activations and allows a later retry', async () => {
    let release: (() => void) | undefined
    const operation = vi.fn(() => new Promise<void>((resolve) => {
      release = resolve
    }))
    const singleFlight = new SingleFlight()

    const first = singleFlight.run(operation)
    const duplicate = singleFlight.run(operation)
    expect(duplicate).toBe(first)
    expect(operation).toHaveBeenCalledTimes(1)

    release?.()
    await first
    const later = singleFlight.run(async () => undefined)
    await later
    expect(later).not.toBe(first)
  })
})
