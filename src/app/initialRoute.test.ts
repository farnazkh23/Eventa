import { describe, expect, it } from 'vitest'
import { canEnterInterpretation, shouldResetInitialRoute } from './initialRoute'

describe('initial Eventa route', () => {
  it.each(['/interpretation', '/plan', '/plan/menu', '/templates', '/basics'])('resets a fresh load from %s', (pathname) => {
    expect(shouldResetInitialRoute(pathname)).toBe(true)
  })

  it('keeps the event-entry route', () => {
    expect(shouldResetInitialRoute('/')).toBe(false)
  })

  it('allows interpretation only after event interpretation succeeds', () => {
    expect(canEnterInterpretation({ interpretationStatus: 'idle' })).toBe(false)
    expect(canEnterInterpretation({ interpretationStatus: 'loading' })).toBe(false)
    expect(canEnterInterpretation({ interpretationStatus: 'error' })).toBe(false)
    expect(canEnterInterpretation({ interpretationStatus: 'success' })).toBe(true)
  })
})
