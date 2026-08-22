import { describe, expect, it } from 'vitest'
import { resolveServerPort } from './env.js'

describe('resolveServerPort', () => {
  it('prefers the Railway PORT value', () => {
    expect(resolveServerPort({ PORT: '32145', EVENTA_API_PORT: '8788' })).toBe(32145)
  })

  it('falls back to EVENTA_API_PORT when PORT is absent or invalid', () => {
    expect(resolveServerPort({ EVENTA_API_PORT: '8788' })).toBe(8788)
    expect(resolveServerPort({ PORT: 'invalid', EVENTA_API_PORT: '8789' })).toBe(8789)
  })

  it('uses the local default when neither configured port is valid', () => {
    expect(resolveServerPort({})).toBe(8787)
    expect(resolveServerPort({ PORT: '0', EVENTA_API_PORT: '70000' })).toBe(8787)
  })
})
